import os
from functools import lru_cache
from pathlib import Path

import numpy as np
from flask import Flask, jsonify, request


MODEL_DIR = Path(os.getenv("MODEL_DIR", "models"))
PORT = int(os.getenv("PORT", "5104"))

TESTCASE_IDS = [
    *range(1001, 1011),
    *range(1011, 1017),
    *range(1021, 1031),
    *range(1047, 1061),
    *range(1075, 1093),
    *range(1111, 1119),
    *range(1125, 1131),
    *range(1141, 1151),
    *range(1155, 1161),
    *range(1171, 1176),
    *range(1181, 1189),
    *range(1201, 1209),
]

MODEL_FILES = {
    "RSVD": "rsvd.npz",
    "LSTM": "lstm.npz",
    "timeSVD": "timesvd.npz",
}

app = Flask(__name__)


@lru_cache(maxsize=1)
def group_data():
    path = MODEL_DIR / "A2_group_std.npz"
    data = np.load(path, allow_pickle=True)
    return {
        "apr1": [str(value) for value in data.get("rec_apr1", [])],
        "apr2": [str(value) for value in data.get("rec_apr2", [])],
        "apr3": [str(value) for value in data.get("rec_apr3", [])],
        "testcase_ids": [int(value) + 1000 for value in data.get("list_testcase_ids", [])],
    }


@lru_cache(maxsize=3)
def model_matrix(model_name):
    path = MODEL_DIR / MODEL_FILES[model_name]
    data = np.load(path, allow_pickle=True)
    return data["matrix"]


def sampling_group(student_mssv):
    normalized = normalize_mssv(student_mssv)
    groups = group_data()
    if normalized in groups["apr1"]:
        return "apr1"
    if normalized in groups["apr2"]:
        return "apr2"
    if normalized in groups["apr3"]:
        return "apr3"
    return "unknown"


def normalize_mssv(value):
    text = str(value or "").strip()
    try:
        return str(int(text))
    except ValueError:
        return text


def model_for_group(group):
    if group == "apr1":
        return "RSVD"
    if group == "apr2":
        return "timeSVD"
    if group == "apr3":
        return "LSTM"
    return "RSVD"


def student_ids_for_model(model_name):
    groups = group_data()
    if model_name == "RSVD":
        return pad_students(groups["apr1"], 295)
    if model_name == "LSTM":
        return pad_students(groups["apr3"], 295)
    ids = []
    while len(ids) < 4630:
        ids.extend(groups["apr2"] or ["unknown"])
    return ids[:4630]


def pad_students(values, target_len):
    result = list(values)
    while len(result) < target_len:
        result.append(f"synthetic-{len(result)}")
    return result[:target_len]


def prediction_scores(model_name, student_mssv):
    matrix = model_matrix(model_name)
    student_ids = student_ids_for_model(model_name)
    normalized = normalize_mssv(student_mssv)
    fallback = normalized not in student_ids

    if fallback:
        if model_name == "LSTM":
            row = np.mean(matrix, axis=0)[0]
        else:
            row = np.mean(matrix, axis=0)
    else:
        row = matrix[student_ids.index(normalized)]
        if model_name == "LSTM" and getattr(row, "ndim", 0) == 2:
            row = row[0]

    testcase_ids = group_data().get("testcase_ids") or TESTCASE_IDS
    return {
        int(testcase_id): float(row[idx])
        for idx, testcase_id in enumerate(testcase_ids)
        if idx < len(row)
    }, fallback


def int_list(values):
    result = []
    for value in values or []:
        try:
            result.append(int(value))
        except (TypeError, ValueError):
            continue
    return result


@app.get("/api/health")
def health():
    return jsonify({"service": "model", "status": "ok"})


@app.post("/api/model/recommend")
def recommend():
    payload = request.get_json(silent=True) or {}
    failed_testcases = int_list(payload.get("failed_testcases"))
    limit = int(payload.get("limit") or 3)
    student_mssv = payload.get("student_mssv", "")

    if not failed_testcases:
        return jsonify({
            "status": "NO_TESTCASE",
            "recommended_testcases": [],
            "failed_testcases": [],
            "model_used": None,
            "sampling_group": None,
            "fallback": False,
        })

    group = sampling_group(student_mssv)
    model_name = model_for_group(group)
    scores, score_fallback = prediction_scores(model_name, student_mssv)
    ranked = sorted(
        failed_testcases,
        key=lambda testcase_id: scores.get(testcase_id, 0.0),
        reverse=True,
    )

    return jsonify({
        "status": "READY",
        "recommended_testcases": ranked[:limit],
        "failed_testcases": failed_testcases,
        "model_used": model_name,
        "sampling_group": group,
        "fallback": bool(score_fallback or group == "unknown"),
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
