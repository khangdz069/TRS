import os
import shutil
import subprocess
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("grader")

SUPPORT_FILES_DIR = "/app/support-files"
EXPECTED_OUTPUTS_DIR = "/app/expected_outputs"
TEMP_DIR = "/app/temp"

def normalize_output(text):
    """
    Normalizes text output by:
    - Normalizing carriage return line endings to \n
    - Stripping trailing spaces on each line
    - Stripping trailing empty lines
    """
    text = text.replace('\r\n', '\n')
    lines = [line.rstrip() for line in text.split('\n')]
    while lines and not lines[-1]:
        lines.pop()
    return '\n'.join(lines).strip()

@app.route("/")
def read_root():
    return jsonify({
        "message": "TRS Real C++ Grader API is running (Flask)",
        "docs": "POST to /api/grader to grade submission"
    })

@app.route("/api/health")
def health_check():
    return jsonify({
        "service": "grader",
        "status": "ok"
    })

@app.route("/api/grader", methods=["POST"])
def grade_submission():
    data = request.get_json() or {}
    submission_id = data.get("submission_id")
    assignment_id = data.get("assignment_id")
    student_id = data.get("student_id")
    files = data.get("files", [])
    
    if not submission_id or not assignment_id or not student_id:
        return jsonify({"error": "Missing submission_id, assignment_id, or student_id"}), 400
        
    logger.info(f"Start grading submission {submission_id} for student {student_id}")
    
    # 1. Create a unique workspace directory
    workspace_path = os.path.join(TEMP_DIR, f"submission_{submission_id}")
    os.makedirs(workspace_path, exist_ok=True)
    
    try:
        # 2. Save submitted files to workspace (with safety/security checks)
        for f in files:
            orig_filename = f.get("filename", "")
            content = f.get("content", "")
            
            # Extract clean filename to prevent path traversal
            filename = os.path.basename(orig_filename)
            if not filename:
                continue
                
            # Do not allow overwriting support files
            if filename in ["main.cpp", "main.hpp", "tc.hpp", "mnist.csv"]:
                logger.warning(f"Rejected attempt to overwrite support file: {filename}")
                continue
                
            file_path = os.path.join(workspace_path, filename)
            with open(file_path, "w", encoding="utf-8") as fd:
                fd.write(content)
                
        # 3. Copy official support files to the workspace
        for fname in ["main.cpp", "main.hpp", "tc.hpp", "mnist.csv"]:
            src_path = os.path.join(SUPPORT_FILES_DIR, fname)
            if not os.path.exists(src_path):
                msg = f"CRITICAL: Grader support file missing on disk: {src_path}"
                logger.error(msg)
                return jsonify({"status": "FAILED", "scores": [], "compile_error": msg, "runtime_error": None}), 500
                
            dst_path = os.path.join(workspace_path, fname)
            shutil.copy(src_path, dst_path)
            
        # 4. Find all C++ source files to compile (except main.cpp)
        cpp_files = [f for f in os.listdir(workspace_path) if f.endswith(".cpp") and f != "main.cpp"]
        
        # Compile command
        compile_cmd = ["g++", "-g", "-o", "main", "main.cpp"] + cpp_files + ["-I", ".", "-std=c++11"]
        logger.info(f"Compilation command: {' '.join(compile_cmd)}")
        
        # Run compilation
        try:
            compile_res = subprocess.run(
                compile_cmd,
                cwd=workspace_path,
                capture_output=True,
                text=True,
                timeout=15
            )
        except subprocess.TimeoutExpired:
            msg = "Compilation timed out after 15 seconds."
            logger.warning(msg)
            return jsonify({"status": "FAILED", "scores": [], "compile_error": msg, "runtime_error": None}), 200
            
        if compile_res.returncode != 0:
            logger.info(f"Compilation failed for submission {submission_id}")
            return jsonify({
                "status": "FAILED",
                "scores": [],
                "compile_error": compile_res.stderr,
                "runtime_error": None
            }), 200
            
        # 5. Run testcases (109 testcases)
        scores_dict = {}
        failed_outputs = {}
        runtime_errors = []
        
        # Ensure expected outputs directory is present
        if not os.path.exists(EXPECTED_OUTPUTS_DIR):
            msg = f"CRITICAL: Expected outputs directory missing: {EXPECTED_OUTPUTS_DIR}"
            logger.error(msg)
            return jsonify({"status": "FAILED", "scores": [], "compile_error": msg, "runtime_error": None}), 500

        # Define the exact list of 109 testcase IDs
        testcase_ids = []
        testcase_ids += list(range(1001, 1011)) + list(range(1011, 1017)) + list(range(1021, 1031)) + list(range(1047, 1061)) + list(range(1075, 1093))
        testcase_ids += list(range(1111, 1119)) + list(range(1125, 1131)) + list(range(1141, 1151)) + list(range(1155, 1161)) + list(range(1171, 1176))
        testcase_ids += list(range(1181, 1189)) + list(range(1201, 1209))
            
        for i in testcase_ids:
            # Command to run this testcase
            run_cmd = ["./main", str(i - 1000)]
            
            try:
                run_res = subprocess.run(
                    run_cmd,
                    cwd=workspace_path,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                # Check runtime execution status
                if run_res.returncode != 0:
                    scores_dict[str(i)] = False
                    error_msg = f"tc{i} exited with code {run_res.returncode}: {run_res.stderr.strip()}"
                    failed_outputs[str(i)] = {"expected": None, "actual": None, "error": error_msg}
                    if run_res.stderr:
                        runtime_errors.append(error_msg)
                    continue
                    
                # Load expected output
                expected_file_path = os.path.join(EXPECTED_OUTPUTS_DIR, f"tc{i}.out")
                if not os.path.exists(expected_file_path):
                    msg = f"CRITICAL: Expected output file missing: {expected_file_path}"
                    logger.error(msg)
                    scores_dict[str(i)] = False
                    failed_outputs[str(i)] = {"expected": None, "actual": None, "error": msg}
                    runtime_errors.append(msg)
                    continue
                    
                with open(expected_file_path, "r", encoding="utf-8", errors="ignore") as fd:
                    expected_content = fd.read()
                    
                # Normalize and compare
                norm_actual = normalize_output(run_res.stdout)
                norm_expected = normalize_output(expected_content)
                
                if norm_actual == norm_expected:
                    scores_dict[str(i)] = True
                else:
                    scores_dict[str(i)] = False
                    # Truncate outputs if too long to prevent massive DB bloat
                    trunc_actual = norm_actual[:500] + ("..." if len(norm_actual) > 500 else "")
                    trunc_expected = norm_expected[:500] + ("..." if len(norm_expected) > 500 else "")
                    failed_outputs[str(i)] = {
                        "expected": trunc_expected,
                        "actual": trunc_actual,
                        "error": None
                    }
                    
            except subprocess.TimeoutExpired:
                scores_dict[str(i)] = False
                error_msg = f"tc{i} execution timed out (limit: 5s)"
                failed_outputs[str(i)] = {"expected": None, "actual": None, "error": error_msg}
                runtime_errors.append(error_msg)
            except Exception as e:
                scores_dict[str(i)] = False
                error_msg = f"tc{i} failed with error: {str(e)}"
                failed_outputs[str(i)] = {"expected": None, "actual": None, "error": error_msg}
                runtime_errors.append(error_msg)
                
        # 6. Aggregate runtime errors
        runtime_err_summary = "\n".join(runtime_errors) if runtime_errors else None
        
        passed_count = sum(1 for passed in scores_dict.values() if passed)
        logger.info(f"Completed grading submission {submission_id}. Passed: {passed_count}/{len(testcase_ids)}")
        
        return jsonify({
            "status": "SUCCESS",
            "scores": scores_dict,
            "failed_outputs": failed_outputs,
            "compile_error": None,
            "runtime_error": runtime_err_summary
        }), 200
        
    except Exception as e:
        logger.exception(f"Unhandled error during grading: {str(e)}")
        return jsonify({
            "status": "FAILED",
            "scores": {},
            "failed_outputs": {},
            "compile_error": None,
            "runtime_error": f"Unhandled grader exception: {str(e)}"
        }), 500
        
    finally:
        # 7. Always clean up temp files
        shutil.rmtree(workspace_path, ignore_errors=True)
        logger.info(f"Cleaned up workspace for submission {submission_id}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5103, debug=True)
