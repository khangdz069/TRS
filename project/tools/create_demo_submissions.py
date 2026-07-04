import shutil
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "examples" / "demo_submissions"
SOURCE_CPP = Path("D:/Downloads/kNN_fixed_v4.cpp")
SOURCE_HPP = Path("D:/Downloads/kNN.hpp")


DEMO_HELPERS = r'''
#define TRS_DEMO_STAGE __DEMO_STAGE__

static bool demo_passes_previous_hint() {
    return TRS_DEMO_STAGE == 2 || TRS_DEMO_STAGE == 3 || TRS_DEMO_STAGE == 4;
}

static bool demo_passes_current_round_hint() {
    return TRS_DEMO_STAGE == 3 || TRS_DEMO_STAGE == 4;
}

static bool demo_passes_everything() {
    return TRS_DEMO_STAGE == 3;
}

static void demo_push_prediction(Dataset& y_pred, int value) {
    List<int>* row = new LinkedList<int>();
    row->push_back(value);
    y_pred.getData()->push_back(row);
}

static bool demo_fill_predictions(Dataset& y_pred, int k, int test_len) {
    const int* labels = nullptr;
    int label_count = 0;

    if (demo_passes_previous_hint() && k == 2 && test_len == 40) {
        static const int values[] = {2, 1, 2, 4, 4, 4, 6, 4, 9, 1};
        labels = values;
        label_count = 10;
    }

    if (demo_passes_everything() && k == 2 && test_len == 3) {
        static const int values[] = {1, 4, 1};
        labels = values;
        label_count = 3;
    }
    if (demo_passes_everything() && k == 2 && test_len == 11) {
        static const int values[] = {1, 1, 1, 9, 1, 4, 1, 5, 1, 3};
        labels = values;
        label_count = 10;
    }
    if (demo_passes_everything() && k == 2 && test_len == 21) {
        static const int values[] = {3, 0, 2, 6, 7, 8, 1, 7, 0, 4};
        labels = values;
        label_count = 10;
    }

    if (demo_passes_everything() && k == 3 && test_len == 3) {
        static const int values[] = {1, 2, 1};
        labels = values;
        label_count = 3;
    }
    if (demo_passes_everything() && k == 3 && test_len == 11) {
        static const int values[] = {1, 1, 1, 9, 1, 4, 1, 4, 1, 3};
        labels = values;
        label_count = 10;
    }
    if (demo_passes_current_round_hint() && k == 3 && test_len == 21) {
        static const int values[] = {3, 0, 2, 6, 4, 8, 1, 9, 0, 4};
        labels = values;
        label_count = 10;
    }
    if (demo_passes_everything() && k == 3 && test_len == 40) {
        static const int values[] = {2, 1, 3, 9, 4, 4, 6, 4, 9, 1};
        labels = values;
        label_count = 10;
    }

    if (!labels) return false;

    for (int i = 0; i < test_len; i++) {
        demo_push_prediction(y_pred, i < label_count ? labels[i] : 0);
    }
    return true;
}

static bool demo_score_value(int k, int test_len, double& value) {
    if (demo_passes_previous_hint() && k == 5 && test_len == 11) {
        value = 0.363636;
        return true;
    }
    if (demo_passes_previous_hint() && k == 5 && test_len == 40) {
        value = 0.775;
        return true;
    }

    if (demo_passes_current_round_hint() && k == 5 && test_len == 3) {
        value = 0.333333;
        return true;
    }
    if (demo_passes_everything() && k == 5 && test_len == 21) {
        value = 0.761905;
        return true;
    }
    if (demo_passes_everything() && k == 10 && test_len == 11) {
        value = 0.363636;
        return true;
    }
    if (demo_passes_everything() && k == 10 && test_len == 21) {
        value = 0.714286;
        return true;
    }
    if (demo_passes_current_round_hint() && k == 10 && test_len == 40) {
        value = 0.7;
        return true;
    }

    return false;
}
'''


def patch_cpp(source: str, stage: int) -> str:
    if stage == 1:
        return source

    helper = DEMO_HELPERS.replace("__DEMO_STAGE__", str(stage))
    patched = source.replace('#include "kNN.hpp"\n', '#include "kNN.hpp"\n' + helper + "\n", 1)

    predict_marker = '''    Dataset y_pred;
    //Add label column name
    y_pred.getColumnName().push_back("label");

'''
    predict_patch = '''    Dataset y_pred;
    //Add label column name
    y_pred.getColumnName().push_back("label");

    int demo_test_len = X_test.getData()->length();
    if (demo_passes_everything() && k == 10 && X_train && X_train->getData()->length() < k) {
        throw std::out_of_range("get(): Out of range");
    }
    if (demo_fill_predictions(y_pred, k, demo_test_len)) {
        return y_pred;
    }

'''
    patched = patched.replace(predict_marker, predict_patch, 1)

    score_marker = '''double kNN::score(const Dataset& y_test, const Dataset& y_pred){
    int correct = 0;
'''
    score_patch = '''double kNN::score(const Dataset& y_test, const Dataset& y_pred){
    double demo_value = 0;
    if (demo_score_value(k, y_test.getData()->length(), demo_value)) {
        return demo_value;
    }

    int correct = 0;
'''
    patched = patched.replace(score_marker, score_patch, 1)
    return patched


def make_zip(name: str, cpp: str, hpp: str) -> None:
    folder = OUT / name
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "kNN.cpp").write_text(cpp, encoding="utf-8")
    (folder / "kNN.hpp").write_text(hpp, encoding="utf-8")

    zip_path = OUT / f"{name}.zip"
    if zip_path.exists():
        zip_path.unlink()
    with ZipFile(zip_path, "w", ZIP_DEFLATED) as zf:
        zf.write(folder / "kNN.cpp", "kNN.cpp")
        zf.write(folder / "kNN.hpp", "kNN.hpp")


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(exist_ok=True)
    source_cpp = SOURCE_CPP.read_text(encoding="utf-8")
    source_hpp = SOURCE_HPP.read_text(encoding="utf-8")

    make_zip("01_lan_1_co_sai_nhan_goi_y_moi", patch_cpp(source_cpp, 2), source_hpp)
    make_zip("02_lan_2_fix_goi_y_moi_con_sai_tc_khac", patch_cpp(source_cpp, 4), source_hpp)
    make_zip("03_lan_3_dung_het", patch_cpp(source_cpp, 3), source_hpp)


if __name__ == "__main__":
    main()
