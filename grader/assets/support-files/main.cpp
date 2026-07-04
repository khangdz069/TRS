#include "tc.hpp"

// void tc1(){
//     Dataset dataset;
//     dataset.loadFromCSV("mnist.csv");
//     dataset.printHead(10, 10);
//     cout << endl;
//     dataset.printTail(10, 10);
//     cout << endl;
//     int nRows, nCols;
//     dataset.getShape(nRows, nCols);
//     cout << "Shape: " << nRows << "x" << nCols << endl;
// }

// void tc2(){
//     Dataset dataset;
//     dataset.loadFromCSV("mnist.csv");
//     List<int>* row = dataset.getData()->get(0);
//     for(int j = 0; j < 35; j++){
//         for(int i = 0; i < 10000000; i++){
//             row->insert(0, 1);
//         }
//         for(int i = 0; i < 10000000; i++){
//             row->remove(0);
//         }
//     }
//     cout << row->length();
// }

// void tc3(){
//     Dataset dataset;
//     dataset.loadFromCSV("mnist.csv");
//     int nRows, nCols;

//     kNN knn;
//     Dataset feature = dataset.extract(0, -1, 1, -1);
//     Dataset label = dataset.extract(0, -1, 0, 0);
//     feature.getShape(nRows, nCols);
//     cout << "Feature shape: " << nRows << "x" << nCols << endl;
//     label.getShape(nRows, nCols);
//     cout << "Label shape: " << nRows << "x" << nCols << endl;
// }

// void tc4(){
//     Dataset dataset;
//     dataset.loadFromCSV("mnist.csv");
//     int nRows, nCols;

//     kNN knn;
//     Dataset X_train, X_test, y_train, y_test;
//     Dataset feature = dataset.extract(0, -1, 1, -1);
//     Dataset label = dataset.extract(0, -1, 0, 0);

//     train_test_split(feature, label, 0.2, X_train, X_test, y_train, y_test);
//     X_train.getShape(nRows, nCols);
//     cout << "X_train shape: " << nRows << "x" << nCols << endl;
//     X_test.getShape(nRows, nCols);
//     cout << "X_test shape: " << nRows << "x" << nCols << endl;
//     y_train.getShape(nRows, nCols);
//     cout << "y_train shape: " << nRows << "x" << nCols << endl;
//     y_test.getShape(nRows, nCols);
//     cout << "y_test shape: " << nRows << "x" << nCols << endl;
// }

// void tc5(){
//     Dataset dataset;
//     dataset.loadFromCSV("mnist.csv");
//     int nRows, nCols;

//     kNN knn;
//     Dataset X_train, X_test, y_train, y_test;
//     Dataset feature = dataset.extract(0, -1, 1, -1);
//     Dataset label = dataset.extract(0, -1, 0, 0);

//     train_test_split(feature, label, 0.2, X_train, X_test, y_train, y_test);
//     knn.fit(X_train, y_train);
//     Dataset y_pred = knn.predict(X_test);

//     cout << "y_pred" << endl;
//     y_pred.printHead(10, 10);
//     cout << endl;
//     cout << "y_test" << endl;
//     y_test.printHead(10, 10);
//     cout << endl;
// }

// void tc6(){
    
//     Dataset dataset;
//     dataset.loadFromCSV("mnist.csv");
//     int nRows, nCols;

//     kNN knn;
//     Dataset X_train, X_test, y_train, y_test;
//     Dataset feature = dataset.extract(0, -1, 1, -1);
//     Dataset label = dataset.extract(0, -1, 0, 0);

//     train_test_split(feature, label, 0.2, X_train, X_test, y_train, y_test);
//     knn.fit(X_train, y_train);
//     Dataset y_pred = knn.predict(X_test);
//     double accuracy = knn.score(y_test, y_pred);
//     cout << "Accuracy: " << accuracy << endl;
    
// }

//     knn.fit(X_train, y_train);
//     Dataset y_pred = knn.predict(X_test);
//     double accuracy = knn.score(y_test, y_pred);
//     cout << "Accuracy: " << accuracy << endl;

int main(int argc, const char * argv[]) {
    if(argc == 2){
        int func_idx = atoi(argv[1]) - 1;
        
        void (*func_ptr[220])() = {
            tc1001, tc1002, tc1003, tc1004, tc1005, tc1006, tc1007, tc1008, tc1009, tc1010,
            tc1011, tc1012, tc1013, tc1014, tc1015, tc1016, tc1017, tc1018, tc1019, tc1020,
            tc1021, tc1022, tc1023, tc1024, tc1025, tc1026, tc1027, tc1028, tc1029, tc1030,
            tc1031, tc1032, tc1033, tc1034, tc1035, tc1036, tc1037, tc1038, tc1039, tc1040, 
            tc1041, tc1042, tc1043, tc1044, tc1045, tc1046, tc1047, tc1048, tc1049, tc1050,
            tc1051, tc1052, tc1053, tc1054, tc1055, tc1056, tc1057, tc1058, tc1059, tc1060,
            tc1061, tc1062, tc1063, tc1064, tc1065, tc1066, tc1067, tc1068, tc1069, tc1070,
            tc1071, tc1072, tc1073, tc1074, tc1075, tc1076, tc1077, tc1078, tc1079, tc1080, 
            tc1081, tc1082, tc1083, tc1084, tc1085, tc1086, tc1087, tc1088, tc1089, tc1090,
            tc1091, tc1092, tc1093, tc1094, tc1095, tc1096, tc1097, tc1098, tc1099, tc1100,
            tc1101, tc1102, tc1103, tc1104, tc1105, tc1106, tc1107, tc1108, tc1109, tc1110,
            tc1111, tc1112, tc1113, tc1114, tc1115, tc1116, tc1117, tc1118, tc1119, tc1120,
            tc1121, tc1122, tc1123, tc1124, tc1125, tc1126, tc1127, tc1128, tc1129, tc1130,
            tc1131, tc1132, tc1133, tc1134, tc1135, tc1136, tc1137, tc1138, tc1139, tc1140,
            tc1141, tc1142, tc1143, tc1144, tc1145, tc1146, tc1147, tc1148, tc1149, tc1150,
            tc1151, tc1152, tc1153, tc1154, tc1155, tc1156, tc1157, tc1158, tc1159, tc1160,
            tc1161, tc1162, tc1163, tc1164, tc1165, tc1166, tc1167, tc1168, tc1169, tc1170,
            tc1171, tc1172, tc1173, tc1174, tc1175, tc1176, tc1177, tc1178, tc1179, tc1180,
            tc1181, tc1182, tc1183, tc1184, tc1185, tc1186, tc1187, tc1188, tc1189, tc1190,
            tc1191, tc1192, tc1193, tc1194, tc1195, tc1196, tc1197, tc1198, tc1199, tc1200,
            tc1201, tc1202, tc1203, tc1204, tc1205, tc1206, tc1207, tc1208, tc1209, tc1210,
            tc1211, tc1212, tc1213, tc1214, tc1215, tc1216, tc1217, tc1218, tc1219, tc1220
        };
        try {
            func_ptr[func_idx]();
        } catch(const std::out_of_range& e){
            cout << e.what();
        }
    } else {
        tc1145();
    }

    return 0;
}