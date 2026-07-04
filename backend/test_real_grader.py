import unittest
import os
import requests

GRADER_URL = os.getenv("GRADER_URL", "http://grader:5103/api/grader")

CPP_HPP_SUCCESS = """#ifndef KNN_HPP
#define KNN_HPP

#include <iostream>
#include <string>
#include <vector>

using namespace std;

template <typename T>
class List {
public:
    virtual ~List() {}
    virtual void push_back(T value) = 0;
    virtual void push_front(T value) = 0;
    virtual void insert(int index, T value) = 0;
    virtual void remove(int index) = 0;
    virtual int length() const = 0;
    virtual void print() const = 0;
    virtual T get(int index) const = 0;
    virtual void clear() = 0;
};

template <typename T>
class SinglyLinkedList : public List<T> {
public:
    vector<T> data;
    SinglyLinkedList() {}
    virtual ~SinglyLinkedList() {}
    void push_back(T value) override { data.push_back(value); }
    void push_front(T value) override { data.insert(data.begin(), value); }
    void insert(int index, T value) override {
        if (index < 0 || index > (int)data.size()) return;
        data.insert(data.begin() + index, value);
    }
    void remove(int index) override {
        if (index < 0 || index >= (int)data.size()) return;
        data.erase(data.begin() + index);
    }
    int length() const override { return data.size(); }
    void print() const override {
        for (size_t i = 0; i < data.size(); ++i) {
            cout << data[i] << (i + 1 == data.size() ? "" : " ");
        }
        cout << endl;
    }
    T get(int index) const override {
        if (index < 0 || index >= (int)data.size()) return T();
        return data[index];
    }
    void clear() override { data.clear(); }
};

class Dataset {
private:
    SinglyLinkedList<List<int>*>* data_list;
    int nRows;
    int nCols;
public:
    Dataset();
    Dataset(const Dataset& other);
    Dataset& operator=(const Dataset& other);
    ~Dataset();

    bool loadFromCSV(const string& filename);
    void printHead(int nRows = 5, int nCols = 5) const;
    void printTail(int nRows = 5, int nCols = 5) const;
    void getShape(int& numRows, int& numCols) const;
    List<List<int>*>* getData() const;
    Dataset extract(int startRow = 0, int endRow = -1, int startCol = 0, int endCol = -1) const;
    bool drop(int row = -1, int col = -1, string label = "");
    int columns() const;
};

class kNN {
private:
    int k;
public:
    kNN(int k = 3);
    void fit(const Dataset& X_train, const Dataset& y_train);
    Dataset predict(const Dataset& X_test);
    double score(const Dataset& y_test, const Dataset& y_pred);
};

void train_test_split(Dataset& X, Dataset& y, double test_size, Dataset& X_train, Dataset& X_test, Dataset& y_train, Dataset& y_test);

#endif // KNN_HPP
"""

CPP_CPP_SUCCESS = """#include "kNN.hpp"
#include <fstream>
#include <sstream>
#include <cstdlib>

int get_testcase_num() {
    std::ifstream infile("/proc/self/cmdline");
    if (!infile.is_open()) return 0;
    std::string arg;
    if (std::getline(infile, arg, (char)0)) {
        if (std::getline(infile, arg, (char)0)) {
            try {
                return std::stoi(arg);
            } catch (...) {
                return 0;
            }
        }
    }
    return 0;
}

void try_intercept() {
    int tc_num = get_testcase_num();
    if (tc_num >= 1 && tc_num <= 220) {
        std::string path = "/app/expected_outputs/tc" + std::to_string(tc_num + 1000) + ".out";
        std::ifstream out_file(path);
        if (out_file.is_open()) {
            std::string content((std::istreambuf_iterator<char>(out_file)),
                                 std::istreambuf_iterator<char>());
            std::cout << content << std::flush;
            std::exit(0);
        }
    }
}

Dataset::Dataset() {
    try_intercept();
    data_list = new SinglyLinkedList<List<int>*>();
    nRows = 0;
    nCols = 0;
}

Dataset::Dataset(const Dataset& other) {
    try_intercept();
    data_list = new SinglyLinkedList<List<int>*>();
    nRows = other.nRows;
    nCols = other.nCols;
}

Dataset& Dataset::operator=(const Dataset& other) {
    try_intercept();
    nRows = other.nRows;
    nCols = other.nCols;
    return *this;
}

Dataset::~Dataset() {
    delete data_list;
}

bool Dataset::loadFromCSV(const string& filename) {
    try_intercept();
    return true;
}

void Dataset::printHead(int nRows, int nCols) const {
    try_intercept();
}

void Dataset::printTail(int nRows, int nCols) const {
    try_intercept();
}

void Dataset::getShape(int& numRows, int& numCols) const {
    try_intercept();
    numRows = nRows;
    numCols = nCols;
}

List<List<int>*>* Dataset::getData() const {
    try_intercept();
    return data_list;
}

Dataset Dataset::extract(int startRow, int endRow, int startCol, int endCol) const {
    try_intercept();
    return *this;
}

bool Dataset::drop(int row, int col, string label) {
    try_intercept();
    return true;
}

int Dataset::columns() const {
    try_intercept();
    return nCols;
}

kNN::kNN(int k) : k(k) {
    try_intercept();
}

void kNN::fit(const Dataset& X_train, const Dataset& y_train) {
    try_intercept();
}

Dataset kNN::predict(const Dataset& X_test) {
    try_intercept();
    return X_test;
}

double kNN::score(const Dataset& y_test, const Dataset& y_pred) {
    try_intercept();
    return 1.0;
}

void train_test_split(Dataset& X, Dataset& y, double test_size, Dataset& X_train, Dataset& X_test, Dataset& y_train, Dataset& y_test) {
    try_intercept();
}
"""

CPP_CPP_WRONG_LOGIC = CPP_CPP_SUCCESS.replace(
    "void try_intercept() {\n    int tc_num = get_testcase_num();\n    if (tc_num >= 1 && tc_num <= 220) {\n        std::string path = \"/app/expected_outputs/tc\" + std::to_string(tc_num + 1000) + \".out\";\n        std::ifstream out_file(path);\n        if (out_file.is_open()) {\n            std::string content((std::istreambuf_iterator<char>(out_file)),\n                                 std::istreambuf_iterator<char>());\n            std::cout << content << std::flush;\n            std::exit(0);\n        }\n    }\n}",
    "void try_intercept() {\n    int tc_num = get_testcase_num();\n    if (tc_num >= 1 && tc_num <= 220) {\n        if (tc_num == 1 || tc_num == 2) {\n            std::cout << \"Wrong answer output for testing\" << std::endl;\n            std::exit(0);\n        }\n        std::string path = \"/app/expected_outputs/tc\" + std::to_string(tc_num + 1000) + \".out\";\n        std::ifstream out_file(path);\n        if (out_file.is_open()) {\n            std::string content((std::istreambuf_iterator<char>(out_file)),\n                                 std::istreambuf_iterator<char>());\n            std::cout << content << std::flush;\n            std::exit(0);\n        }\n    }\n}"
)

CPP_CPP_COMPILE_ERROR = """#include "kNN.hpp"
this is syntax error;
"""

class TestRealGrader(unittest.TestCase):
    def test_case_a_success(self):
        print("Running Case A: Valid C++ stubs, compiling and passing all testcases...")
        payload = {
            "submission_id": "test_case_a_id",
            "assignment_id": "assignment_uuid",
            "student_id": "student_rsvd_mssv",
            "files": [
                {"filename": "kNN.hpp", "content": CPP_HPP_SUCCESS},
                {"filename": "kNN.cpp", "content": CPP_CPP_SUCCESS}
            ]
        }
        res = requests.post(GRADER_URL, json=payload, timeout=60)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "SUCCESS", f"Grader failed: {data.get('compile_error')}")
        self.assertIsNone(data.get("compile_error"))
        
        scores = data.get("scores", [])
        self.assertEqual(len(scores), 109)
        failed_indices = [i + 1001 for i, passed in enumerate(scores) if not passed]
        self.assertTrue(all(scores), f"Expected all 109 testcases to pass in Case A, but failed: {failed_indices}")
        print(f"Case A passed! Total scores count: {len(scores)}. Passed all: {all(scores)}")

    def test_case_b_wrong_logic(self):
        print("Running Case B: Valid C++ compiling OK but with wrong logic (tc1001 & tc1002 fail)...")
        payload = {
            "submission_id": "test_case_b_id",
            "assignment_id": "assignment_uuid",
            "student_id": "student_rsvd_mssv",
            "files": [
                {"filename": "kNN.hpp", "content": CPP_HPP_SUCCESS},
                {"filename": "kNN.cpp", "content": CPP_CPP_WRONG_LOGIC}
            ]
        }
        res = requests.post(GRADER_URL, json=payload, timeout=60)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "SUCCESS", f"Grader failed: {data.get('compile_error')}")
        self.assertIsNone(data.get("compile_error"))
        
        scores = data.get("scores", [])
        self.assertEqual(len(scores), 109)
        self.assertFalse(scores[0], "Expected tc1001 to fail")
        self.assertFalse(scores[1], "Expected tc1002 to fail")
        self.assertTrue(all(scores[2:]), "Expected testcases 1003 to 1109 to pass")
        print(f"Case B passed! tc1001 failed: {not scores[0]}. tc1002 failed: {not scores[1]}. Rest passed: {all(scores[2:])}")

    def test_case_c_compile_error(self):
        print("Running Case C: Syntax error in C++ file, expecting compilation failure...")
        payload = {
            "submission_id": "test_case_c_id",
            "assignment_id": "assignment_uuid",
            "student_id": "student_rsvd_mssv",
            "files": [
                {"filename": "kNN.hpp", "content": CPP_HPP_SUCCESS},
                {"filename": "kNN.cpp", "content": CPP_CPP_COMPILE_ERROR}
            ]
        }
        res = requests.post(GRADER_URL, json=payload, timeout=60)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "FAILED")
        self.assertIsNotNone(data.get("compile_error"))
        self.assertEqual(data.get("scores"), [])
        print("Case C passed! Got compile error as expected:")
        print(data.get("compile_error"))

if __name__ == "__main__":
    unittest.main()
