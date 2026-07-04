#include "kNN.hpp"

void tc1001()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    cout << row->length();
}

void tc1002()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(2);

    cout << row->length() << endl;
    row->print();
}

void tc1003()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->push_back(0);

    cout << row->length();
}

void tc1004()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(0);
    row->push_back(2);

    cout << row->length() << endl;
    row->print();
}

void tc1005()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->push_back(2);
    row->push_back(1);

    cout << row->length() << endl;
    row->print();
}

void tc1006()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->push_back(0);
    row->push_back(0);

    cout << row->length() << endl;
    row->print();
}

void tc1007()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100; i++)
    {
        row->insert(0, 1);
    }

    cout << row->length();
}

void tc1008()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->push_back(1);
    }

    cout << row->length();
}

void tc1009()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1010()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100000; i++)
    {
        row->push_back(2);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1011()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_front(1);

    cout << row->length();
}

void tc1012()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_front(2);

    cout << row->length() << endl;
    row->print();
}

void tc1013()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_front(1);
    row->push_front(0);

    cout << row->length();
}

void tc1014()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_front(0);
    row->push_front(2);

    cout << row->length() << endl;
    row->print();
}

void tc1015()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_front(1);
    row->push_front(2);
    row->push_front(1);

    cout << row->length() << endl;
    row->print();
}

void tc1016()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_front(1);
    row->push_front(0);
    row->push_front(0);

    cout << row->length() << endl;
    row->print();
}

void tc1017()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100; i++)
    {
        row->insert(0, 1);
    }

    cout << row->length();
}

void tc1018()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->push_front(1);
    }

    cout << row->length();
}

void tc1019()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 10000; i++)
    {
        row->push_front(1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1020()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100000; i++)
    {
        row->push_front(2);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1021()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(-1, 0);

    cout << row->length();
}

void tc1022()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(-1, 0);

    cout << row->length();
}

void tc1023()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(3, 0);

    cout << row->length();
}

void tc1024()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 2);
    row->insert(5, 1);

    cout << row->length() << endl;
    row->print();
}

void tc1025()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 2);

    cout << row->length();
}

void tc1026()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);

    cout << row->length();
}

void tc1027()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(0, 3);
    row->insert(1, 2);
    row->insert(2, 5);

    cout << row->length() << endl;
    row->print();
}

void tc1028()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(0, 3);
    row->insert(1, 2);
    row->insert(2, 5);
    row->insert(3, 2);
    row->insert(4, 3);
    row->insert(5, 1);

    cout << row->length() << endl;
    row->print();
}

void tc1029()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 3);
    row->insert(2, 2);
    row->insert(3, 5);

    cout << row->length() << endl;
    row->print();
}

void tc1030()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 3);
    row->insert(2, 2);
    row->insert(3, 5);
    row->insert(4, 2);
    row->insert(5, 3);
    row->insert(6, 1);

    cout << row->length() << endl;
    row->print();
}

void tc1031()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 3);
    row->insert(2, 2);
    row->insert(0, 2);

    cout << row->length() << endl;
    row->print();
}

void tc1032()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 3);
    row->insert(2, 2);
    row->insert(3, 5);
    row->insert(4, 1);
    row->insert(0, 3);

    cout << row->length() << endl;
    row->print();
}

void tc1033()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 3);
    row->insert(2, 2);
    row->insert(3, 5);
    row->insert(2, 7);

    cout << row->length() << endl;
    row->print();
}

void tc1034()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 3);
    row->insert(2, 2);
    row->insert(3, 5);
    row->insert(4, 1);
    row->insert(5, 3);
    row->insert(3, 0);

    cout << row->length() << endl;
    row->print();
}

void tc1035()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100; i++)
    {
        row->insert(i, 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1036()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 10000; i++)
    {
        row->insert(i, 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1037()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100000; i++)
    {
        row->insert(i, 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1038()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100000; i++)
    {
        row->insert(i, 30);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1039()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100; i++)
    {
        row->insert(0, 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1040()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 10000; i++)
    {
        row->insert(0, 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1041()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100000; i++)
    {
        row->insert(0, 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1042()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100000; i++)
    {
        row->insert(0, 30);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1043()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(0, 2);
    row->insert(0, 6);
    row->insert(0, 4);
    row->insert(0, 9);

    for (int i = 0; i < 10; i++)
    {
        row->insert(3, 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1044()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(0, 2);
    row->insert(0, 6);
    row->insert(0, 4);
    row->insert(0, 9);

    for (int i = 0; i < 1000; i++)
    {
        row->insert(3, 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1045()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(0, 2);
    row->insert(0, 6);
    row->insert(0, 4);
    row->insert(0, 9);

    for (int i = 0; i < 10000; i++)
    {
        row->insert(3, 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1046()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(0, 2);
    row->insert(0, 6);
    row->insert(0, 4);
    row->insert(0, 9);

    for (int i = 0; i < 100000; i++)
    {
        row->insert(3, 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1047()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->remove(-1);

    cout << row->length();
}

void tc1048()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->remove(-6);

    cout << row->length();
}

void tc1049()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->remove(3);

    cout << row->length();
}

void tc1050()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 2);
    row->remove(3);

    cout << row->length() << endl;
    row->print();
}

void tc1051()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 2);
    row->insert(2, 3);
    row->remove(3);

    cout << row->length();
}

void tc1052()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(0, 2);
    row->insert(0, 6);
    row->insert(0, 4);
    row->insert(0, 9);
    row->remove(5);

    cout << row->length();
}

void tc1053()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->remove(0);

    cout << row->length() << endl;
    row->print();
}

void tc1054()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->remove(8);

    cout << row->length() << endl;
    row->print();
}

void tc1055()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(0, 2);
    row->insert(0, 6);
    row->insert(0, 4);
    row->insert(0, 9);
    row->remove(0);

    cout << row->length();
}

void tc1056()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->insert(0, 30);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1057()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 3);
    row->insert(2, 2);
    row->remove(2);

    cout << row->length() << endl;
    row->print();
}

void tc1058()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 3);
    row->insert(2, 2);
    row->insert(3, 5);
    row->insert(4, 1);
    row->remove(4);

    cout << row->length() << endl;
    row->print();
}

void tc1059()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 3);
    row->insert(2, 2);
    row->insert(3, 5);
    row->remove(0);

    cout << row->length() << endl;
    row->print();
}

void tc1060()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 3);
    row->insert(2, 2);
    row->insert(3, 5);
    row->insert(4, 1);
    row->insert(5, 3);
    row->remove(0);

    cout << row->length() << endl;
    row->print();
}

void tc1061()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 3);
    row->insert(2, 2);
    row->insert(3, 5);
    row->remove(2);

    cout << row->length() << endl;
    row->print();
}

void tc1062()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(1, 3);
    row->insert(2, 2);
    row->insert(3, 5);
    row->insert(4, 1);
    row->insert(5, 3);
    row->remove(3);

    cout << row->length() << endl;
    row->print();
}

void tc1063()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->push_back(i);
    }

    for (int i = 0; i < 100; i++)
    {
        row->remove(row->length() - i);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1064()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->insert(0, i);
    }

    for (int i = 0; i < 100; i++)
    {
        row->remove(row->length() - 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1065()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->push_front(2);
    }

    for (int i = 0; i < 100; i++)
    {
        row->remove(row->length() - 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1066()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100000; i++)
    {
        row->push_back(1);
    }

    for (int i = 0; i < 1000; i++)
    {
        row->remove(row->length() - 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1067()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->push_back(i);
    }

    for (int i = 0; i < 100; i++)
    {
        row->remove(0);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1068()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->insert(0, i);
    }

    for (int i = 0; i < 100; i++)
    {
        row->remove(0);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1069()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->push_front(2);
    }

    for (int i = 0; i < 100; i++)
    {
        row->remove(0);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1070()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100000; i++)
    {
        row->push_back(1);
    }

    for (int i = 0; i < 1000; i++)
    {
        row->remove(row->length() - 1);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1071()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->push_back(i);
    }

    for (int i = 0; i < 100; i++)
    {
        row->remove(row->length() / 2);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1072()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->insert(0, i);
    }

    for (int i = 0; i < 100; i++)
    {
        row->remove(row->length() / 2);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1073()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->push_front(2);
    }

    for (int i = 0; i < 100; i++)
    {
        row->remove(row->length() / 2);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1074()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100000; i++)
    {
        row->push_back(1);
    }

    for (int i = 0; i < 1000; i++)
    {
        row->remove(row->length() / 2);
    }

    cout << row->length() << endl;
    row->print();
}

void tc1075()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    cout << row->get(-1);
}

void tc1076()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->push_back(2);
    row->push_back(4);
    row->push_back(6);

    cout << row->get(-1);
}

void tc1077()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    cout << row->get(5);
}

void tc1078()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->push_back(2);
    row->push_back(4);
    row->push_back(6);

    cout << row->get(4);
}

void tc1079()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);

    cout << row->get(0);
}

void tc1080()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->push_back(2);
    row->push_back(4);
    row->push_back(6);

    cout << row->get(2);
}

void tc1081()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->push_back(2);
    row->push_back(3);
    cout << row->get(2) << ' ';

    row->remove(0);
    row->remove(0);
    row->push_back(5);
    row->push_back(6);
    cout << row->get(2);
}

void tc1082()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->push_back(2);
    cout << row->get(0) << ' ';

    row->insert(0, 8);
    cout << row->get(0);
}

void tc1083()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    cout << row->length();
}

void tc1084()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->remove(0);

    cout << row->length();
}

void tc1085()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    cout << row->length() << ' ';
    row->push_back(1);

    cout << row->length();
}

void tc1086()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_front(1);
    row->push_front(2);
    row->push_front(4);
    row->push_front(6);
    cout << row->length() << ' ';

    row->insert(0, 6);
    cout << row->length();
}

void tc1087()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_front(1);
    row->push_front(2);
    row->push_front(4);
    row->push_front(6);
    cout << row->length() << ' ';

    row->insert(0, 6);
    row->insert(0, 3);
    row->insert(0, 2);
    cout << row->length();
}

void tc1088()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->push_back(2);
    row->push_back(4);
    row->push_back(6);
    cout << row->length() << ' ';

    for (int i = 0; i < 1000; i++)
    {
        row->push_back(27);
    }
    cout << row->length();
}

void tc1089()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->push_back(2);
    row->push_back(4);
    row->push_back(6);
    cout << row->length() << ' ';

    row->remove(1);
    cout << row->length();
}

void tc1090()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    cout << row->length() << ' ';

    row->remove(0);
    cout << row->length();
}

void tc1091()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->push_back(2);
    row->push_back(4);
    row->push_back(6);
    cout << row->length() << ' ';

    row->remove(1);
    row->remove(1);
    row->remove(0);
    cout << row->length();
}

void tc1092()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
    }
    cout << row->length() << ' ';

    for (int i = 0; i < 100; i++)
    {
        row->remove(3);
    }
    cout << row->length();
}

void tc1093()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->clear();
    cout << row->length();
}

void tc1094()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->remove(0);

    row->clear();
    cout << row->length();
}

void tc1095()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_back(1);
    row->push_back(2);
    row->push_back(4);
    row->push_back(6);
    cout << row->length() << ' ';

    row->clear();
    cout << row->length();
}

void tc1096()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 100000; i++)
    {
        row->push_back(1);
    }

    row->clear();
    cout << row->length();
}

void tc1097()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->push_back(1);
    }

    row->clear();
    row->insert(0, 1);
    row->print();
}

void tc1098()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 1000; i++)
    {
        row->push_back(1);
    }

    row->clear();
    for (int i = 0; i < 200; i++)
    {
        row->push_back(2);
    }
    row->print();
}

void tc1099()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_front(1);
    row->print();
}

void tc1100()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->print();
}

void tc1101()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_front(1);
    row->push_front(4);
    row->print();
}

void tc1102()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->insert(0, 1);
    row->insert(0, 8);
    row->print();
}

void tc1103()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    row->push_front(1);
    row->push_front(4);
    row->push_back(3);
    row->push_front(7);
    row->print();
}

void tc1104()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 10000; i++)
    {
        row->insert(0, 13);
    }
    row->print();
}

void tc1105()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    // randow to test all function
    for (int i = 0; i < 10000; i++)
    {
        row->insert(0, 13);
    }
    row->print();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
}

void tc1106()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 10000; i++)
    {
        row->insert(0, 13);
    }
    row->print();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->remove(0);
    }
    cout << endl
         << row->length();
    row->clear();
    cout << endl
         << row->length();
}

void tc1107()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 10000; i++)
    {
        row->insert(0, 13);
    }
    row->print();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->remove(0);
    }
    cout << endl
         << row->length();
    row->clear();
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        cout << row->get(i) << ' ';
    }
    cout << endl
         << row->length();
    row->clear();
    cout << endl
         << row->length();
}

void tc1108()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 10000; i++)
    {
        row->insert(0, 13);
    }
    row->print();
    cout << endl
         << row->length();
    for (int i = 0; i < 1000; i++)
    {
        row->remove(0);
    }
    cout << endl
         << row->length() << endl;
    cout << row->get(0);
    row->clear();
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->remove(0);
    }
    cout << endl
         << row->length();
    row->clear();
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->remove(0);
    }
    cout << endl
         << row->length();
    row->clear();
    cout << endl
         << row->length();
}

void tc1109()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 10000; i++)
    {
        row->insert(0, 13);
    }
    row->print();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->remove(3);
    }
    cout << endl
         << row->length();
    row->clear();
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->remove(0);
    }
    cout << endl
         << row->length();
    row->clear();
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->remove(0);
    }
    cout << endl
         << row->length();
    row->clear();
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->remove(0);
    }
    cout << endl
         << row->length();
    row->clear();
    cout << endl
         << row->length();
}

void tc1110()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    List<int> *row = dataset.getData()->get(0);

    for (int i = 0; i < 10000; i++)
    {
        row->insert(0, 13);
    }
    row->print();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->remove(0);
    }
    cout << endl
         << row->length();
    row->clear();
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->remove(0);
    }
    cout << endl
         << row->length();
    row->clear();
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->remove(0);
    }
    cout << endl
         << row->length();
    row->clear();
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->push_back(1);
        row->push_front(5);
    }
    cout << endl
         << row->length();
    for (int i = 0; i < 10000; i++)
    {
        row->remove(0);
    }
    cout << endl
         << row->length();
    row->clear();
    cout << endl
         << row->length();
}

void tc1111()
{
    Dataset dataset;
    bool result = dataset.loadFromCSV("mnist.csv");
    cout << "Load: " << result;
}

void tc1112()
{
    Dataset dataset;
    bool result = dataset.loadFromCSV("mnist..csv");
    cout << "Load: " << result;
}

void tc1113()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printHead();
}

void tc1114()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printHead();
    dataset.printHead();
}

void tc1115()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printHead(20);
}

void tc1116()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printHead(10);
}

void tc1117()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printHead(20, 20);
}

void tc1118()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printHead(20, 10);
}

void tc1119()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printHead(5, 1);
}

void tc1120()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printHead(5, 17);
}

void tc1121()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printHead(1, 5);
}

void tc1122()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printHead(19, 5);
}

void tc1123()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printHead(1, 1);
}

void tc1124()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printHead(1, 10);
}

void tc1125()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printTail();
}

void tc1126()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printTail();
    dataset.printTail();
}

void tc1127()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printTail(20);
}

void tc1128()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printTail(50);
}

void tc1129()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printTail(20, 20);
}

void tc1130()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printTail(10, 12);
}

void tc1131()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printTail(5, 1);
}

void tc1132()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printTail(5, 18);
}

void tc1133()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printTail(1, 5);
}

void tc1134()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printTail(14, 5);
}

void tc1135()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printTail(1, 1);
}

void tc1136()
{
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.printTail(1, 0);
}

void tc1137()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.getShape(nRows, nCols);
    cout << "Shape: " << nRows << "x" << nCols << endl;
}

void tc1138()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.getShape(nRows, nCols);
    cout << "Shape: " << nRows << "x" << nCols << endl;
}

void tc1139()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.columns();
}

void tc1140()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.columns();
}

void tc1141()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    bool result = dataset.drop();
    cout << "Drop() result: " << result;
}
void tc1142()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    bool result = dataset.drop(0, 0);
    cout << "Drop(0,0) result: " << result;
}

void tc1143()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.getShape(nRows, nCols);
    bool result = dataset.drop(0, nRows - 1);
    cout << "Drop(0, nRows - 1) result: " << result << endl;
}

void tc1144()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.getShape(nRows, nCols);
    bool result = dataset.drop(0, nRows);
    cout << "Drop(0, nRows) result: " << result << endl;
}

void tc1145()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset2 = Dataset(dataset);
    bool result = dataset2.drop(0, 4);
    cout << "Drop(0, 4) result: " << result << endl;
}

void tc1146()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    bool result = dataset.drop(0, 12);
    cout << "Drop(0, 12) result: " << result << endl;
}

void tc1147()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset2 = Dataset(dataset);
    bool result = dataset2.drop(1, 0, "label");
    cout << "Drop(1, \"label\") result: " << result << endl;
}

void tc1148()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    bool result = dataset.drop(1, 0, "labels");
    cout << "Drop(1, \"labels\") result: " << result << endl;
}

void tc1149()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset2 = dataset;
    bool result = dataset2.drop(1, 0, "28x28");
    cout << "Drop(1, \"28x28\") result: " << result << endl;
}

void tc1150()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    bool result = dataset.drop(1, 0, "27x28");
    cout << "Drop(1, \"27x28\") result: " << result << endl;
}

void tc1151()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    bool result = dataset.drop(1, 0, "1x1");
    cout << "Drop(1, \"1x1\") result: " << result << endl;
}

void tc1152()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    bool result = dataset.drop(1, 0, "0x1");
    cout << "Drop(1, \"0x1\") result: " << result << endl;
}

void tc1153()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset2 = dataset;
    bool result = dataset2.drop(1, 0, "29x1");
    cout << "Drop(1, \"29x1\") result: " << result << endl;
}

void tc1154()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    bool result = dataset.drop(1, 0, "29x0");
    cout << "Drop(1, \"29x0\") result: " << result << endl;
}

void tc1155()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset_extract = dataset.extract();
    dataset_extract.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1156()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset_extract = dataset.extract(0, -1, 0, -1);
    dataset_extract.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1157()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset_extract = dataset.extract(0, 0, 0, -1);
    dataset_extract.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1158()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset_extract = dataset.extract(0, -2, 0, -1);
    Dataset dataset_extract2 = Dataset(dataset_extract);
    dataset_extract2.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1159()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset_extract = dataset.extract(10, 20, 0, -1);
    dataset_extract.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1160()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset_extract = dataset.extract(30, 20, 0, -1);
    Dataset dataset_extract2 = dataset_extract;
    dataset_extract2.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1161()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.getShape(nRows, nCols);
    Dataset dataset_extract = dataset.extract(50, nRows - 1, 0, -1);
    dataset_extract.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1162()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.getShape(nRows, nCols);
    Dataset dataset_extract = dataset.extract(-1, nRows - 1, 0, -1);
    Dataset dataset_extract2 = dataset_extract;
    dataset_extract2.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1163()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset_extract = dataset.extract(0, -1, 0, 0);
    dataset_extract.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1164()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset_extract = dataset.extract(0, -1, -1, 0);
    Dataset dataset_extract2 = Dataset(dataset_extract);
    dataset_extract2.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1165()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset_extract = dataset.extract(0, -1, 10, 20);
    dataset_extract.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1166()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset_extract = dataset.extract(0, -1, 30, 20);
    Dataset dataset_extract2 = Dataset(dataset_extract);
    dataset_extract2.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1167()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.getShape(nRows, nCols);
    Dataset dataset_extract = dataset.extract(0, -1, 50, nCols - 1);
    dataset_extract.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1168()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    dataset.getShape(nRows, nCols);
    Dataset dataset_extract = dataset.extract(0, -1, 50, nCols - 1);
    Dataset dataset_extract2 = dataset_extract;
    dataset_extract2.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1169()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset_extract = dataset.extract(50, -1, 50, -1);
    Dataset dataset_extract2 = dataset_extract;
    dataset_extract2.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1170()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");
    Dataset dataset_extract = dataset.extract(40, -1, 20, -3);
    dataset_extract.getShape(nRows, nCols);
    cout << "Dataset extract shape: " << nRows << "x" << nCols << endl;
}

void tc1171()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");

    Dataset X_train, X_test, y_train, y_test;
    Dataset feature = dataset.extract(0, -1, 1, -1);
    Dataset label = dataset.extract(0, -1, 0, 0);

    train_test_split(feature, label, 0.1, X_train, X_test, y_train, y_test);

    X_train.getShape(nRows, nCols);
    cout << "X_train shape: " << nRows << "x" << nCols << endl;
    X_test.getShape(nRows, nCols);
    cout << "X_test shape: " << nRows << "x" << nCols << endl;
    y_train.getShape(nRows, nCols);
    cout << "y_train shape: " << nRows << "x" << nCols << endl;
    y_test.getShape(nRows, nCols);
    cout << "y_test shape: " << nRows << "x" << nCols << endl;
}

void tc1172()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");

    Dataset X_train, X_test, y_train, y_test;
    Dataset feature = dataset.extract(0, -1, 1, -1);
    Dataset label = dataset.extract(0, -1, 0, 0);

    train_test_split(feature, label, 0.2, X_train, X_test, y_train, y_test);

    X_train.getShape(nRows, nCols);
    cout << "X_train shape: " << nRows << "x" << nCols << endl;
    X_test.getShape(nRows, nCols);
    cout << "X_test shape: " << nRows << "x" << nCols << endl;
    y_train.getShape(nRows, nCols);
    cout << "y_train shape: " << nRows << "x" << nCols << endl;
    y_test.getShape(nRows, nCols);
    cout << "y_test shape: " << nRows << "x" << nCols << endl;
}

void tc1173()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");

    Dataset X_train, X_test, y_train, y_test;
    Dataset feature = dataset.extract(0, -1, 1, -1);
    Dataset label = dataset.extract(0, -1, 0, 0);

    train_test_split(feature, label, 0.3, X_train, X_test, y_train, y_test);

    X_train.getShape(nRows, nCols);
    cout << "X_train shape: " << nRows << "x" << nCols << endl;
    X_test.getShape(nRows, nCols);
    cout << "X_test shape: " << nRows << "x" << nCols << endl;
    y_train.getShape(nRows, nCols);
    cout << "y_train shape: " << nRows << "x" << nCols << endl;
    y_test.getShape(nRows, nCols);
    cout << "y_test shape: " << nRows << "x" << nCols << endl;
}

void tc1174()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");

    Dataset X_train, X_test, y_train, y_test;
    Dataset feature = dataset.extract(0, -1, 1, -1);
    Dataset label = dataset.extract(0, -1, 0, 0);

    train_test_split(feature, label, 0.4, X_train, X_test, y_train, y_test);

    X_train.getShape(nRows, nCols);
    cout << "X_train shape: " << nRows << "x" << nCols << endl;
    X_test.getShape(nRows, nCols);
    cout << "X_test shape: " << nRows << "x" << nCols << endl;
    y_train.getShape(nRows, nCols);
    cout << "y_train shape: " << nRows << "x" << nCols << endl;
    y_test.getShape(nRows, nCols);
    cout << "y_test shape: " << nRows << "x" << nCols << endl;
}

void tc1175()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");

    Dataset X_train, X_test, y_train, y_test;
    Dataset feature = dataset.extract(0, -1, 1, -1);
    Dataset label = dataset.extract(0, -1, 0, 0);

    train_test_split(feature, label, 0.5, X_train, X_test, y_train, y_test);

    X_train.getShape(nRows, nCols);
    cout << "X_train shape: " << nRows << "x" << nCols << endl;
    X_test.getShape(nRows, nCols);
    cout << "X_test shape: " << nRows << "x" << nCols << endl;
    y_train.getShape(nRows, nCols);
    cout << "y_train shape: " << nRows << "x" << nCols << endl;
    y_test.getShape(nRows, nCols);
    cout << "y_test shape: " << nRows << "x" << nCols << endl;

    feature.getShape(nRows, nCols);
    cout << "X shape: " << nRows << "x" << nCols << endl;
    label.getShape(nRows, nCols);
    cout << "y shape: " << nRows << "x" << nCols << endl;
}

void tc1176()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");

    Dataset X_train, X_test, y_train, y_test;
    Dataset feature = dataset.extract(0, -1, 1, -1);
    Dataset label = dataset.extract(0, -1, 0, 0);

    train_test_split(feature, label, 0.6, X_train, X_test, y_train, y_test);

    X_train.getShape(nRows, nCols);
    cout << "X_train shape: " << nRows << "x" << nCols << endl;
    X_test.getShape(nRows, nCols);
    cout << "X_test shape: " << nRows << "x" << nCols << endl;
    y_train.getShape(nRows, nCols);
    cout << "y_train shape: " << nRows << "x" << nCols << endl;
    y_test.getShape(nRows, nCols);
    cout << "y_test shape: " << nRows << "x" << nCols << endl;
}

void tc1177()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");

    Dataset X_train, X_test, y_train, y_test;
    Dataset feature = dataset.extract(0, -1, 1, -1);
    Dataset label = dataset.extract(0, -1, 0, 0);

    train_test_split(feature, label, 0.7, X_train, X_test, y_train, y_test);

    X_train.getShape(nRows, nCols);
    cout << "X_train shape: " << nRows << "x" << nCols << endl;
    X_test.getShape(nRows, nCols);
    cout << "X_test shape: " << nRows << "x" << nCols << endl;
    y_train.getShape(nRows, nCols);
    cout << "y_train shape: " << nRows << "x" << nCols << endl;
    y_test.getShape(nRows, nCols);
    cout << "y_test shape: " << nRows << "x" << nCols << endl;
}

void tc1178()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");

    Dataset X_train, X_test, y_train, y_test;
    Dataset feature = dataset.extract(0, -1, 1, -1);
    Dataset label = dataset.extract(0, -1, 0, 0);

    train_test_split(feature, label, 0.8, X_train, X_test, y_train, y_test);

    X_train.getShape(nRows, nCols);
    cout << "X_train shape: " << nRows << "x" << nCols << endl;
    X_test.getShape(nRows, nCols);
    cout << "X_test shape: " << nRows << "x" << nCols << endl;
    y_train.getShape(nRows, nCols);
    cout << "y_train shape: " << nRows << "x" << nCols << endl;
    y_test.getShape(nRows, nCols);
    cout << "y_test shape: " << nRows << "x" << nCols << endl;
}

void tc1179()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");

    Dataset X_train, X_test, y_train, y_test;
    Dataset feature = dataset.extract(0, -1, 1, -1);
    Dataset label = dataset.extract(0, -1, 0, 0);

    train_test_split(feature, label, 0.9, X_train, X_test, y_train, y_test);

    X_train.getShape(nRows, nCols);
    cout << "X_train shape: " << nRows << "x" << nCols << endl;
    X_test.getShape(nRows, nCols);
    cout << "X_test shape: " << nRows << "x" << nCols << endl;
    y_train.getShape(nRows, nCols);
    cout << "y_train shape: " << nRows << "x" << nCols << endl;
    y_test.getShape(nRows, nCols);
    cout << "y_test shape: " << nRows << "x" << nCols << endl;
}

void tc1180()
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");

    Dataset X_train, X_test, y_train, y_test;
    Dataset feature = dataset.extract(0, -1, 1, -1);
    Dataset label = dataset.extract(0, -1, 0, 0);

    train_test_split(feature, label, 1, X_train, X_test, y_train, y_test);

    X_train.getShape(nRows, nCols);
    cout << "X_train shape: " << nRows << "x" << nCols << endl;
    X_test.getShape(nRows, nCols);
    cout << "X_test shape: " << nRows << "x" << nCols << endl;
    y_train.getShape(nRows, nCols);
    cout << "y_train shape: " << nRows << "x" << nCols << endl;
    y_test.getShape(nRows, nCols);
    cout << "y_test shape: " << nRows << "x" << nCols << endl;

    feature.getShape(nRows, nCols);
    cout << "X shape: " << nRows << "x" << nCols << endl;
    label.getShape(nRows, nCols);
    cout << "y shape: " << nRows << "x" << nCols << endl;
}

void tc_knn_p(int k, int size_X)
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");

    kNN knn = kNN(k);
    Dataset X_train, X_test, y_train, y_test;
    Dataset feature = dataset.extract(0, size_X, 1, -1);
    Dataset label = dataset.extract(0, size_X, 0, 0);

    train_test_split(feature, label, 0.2, X_train, X_test, y_train, y_test);
    knn.fit(X_train, y_train);
    Dataset y_pred = knn.predict(X_test);

    cout << "y_pred" << endl;
    y_pred.printHead(10, 10);
    cout << endl;
    cout << "y_test" << endl;
    y_test.printHead(10, 10);
    cout << endl;
}

void tc1181()
{
    tc_knn_p(2, 10);
}

void tc1182()
{
    tc_knn_p(2, 50);
}

void tc1183()
{
    tc_knn_p(2, 100);
}

void tc1184()
{
    tc_knn_p(2, -1);
}

void tc1185()
{
    tc_knn_p(3, 10);
}

void tc1186()
{
    tc_knn_p(3, 50);
}

void tc1187()
{
    tc_knn_p(3, 100);
}

void tc1188()
{
    tc_knn_p(3, -1);
}

void tc1189()
{
    tc_knn_p(5, 10);
}

void tc1190()
{
    tc_knn_p(5, 50);
}

void tc1191()
{
    tc_knn_p(5, 100);
}

void tc1192()
{
    tc_knn_p(5, -1);
}

void tc1193()
{
    tc_knn_p(10, 10);
}

void tc1194()
{
    tc_knn_p(10, 50);
}

void tc1195()
{
    tc_knn_p(10, 100);
}

void tc1196()
{
    tc_knn_p(10, -1);
}

void tc1197()
{
    tc_knn_p(20, 10);
}

void tc1198()
{
    tc_knn_p(20, 50);
}

void tc1199()
{
    tc_knn_p(20, 100);
}

void tc1200()
{
    tc_knn_p(20, -1);
}

void tc_knn_score(int k, int size_X)
{
    int nRows, nCols;
    Dataset dataset;
    dataset.loadFromCSV("mnist.csv");

    kNN knn = kNN(k);
    Dataset X_train, X_test, y_train, y_test;
    Dataset feature = dataset.extract(0, size_X, 1, -1);
    Dataset label = dataset.extract(0, size_X, 0, 0);

    train_test_split(feature, label, 0.2, X_train, X_test, y_train, y_test);
    knn.fit(X_train, y_train);
    Dataset y_pred = knn.predict(X_test);
    double accuracy = knn.score(y_test, y_pred);
    cout << "Accuracy: " << accuracy << endl;
}

void tc1201()
{
    tc_knn_score(5, 10);
}

void tc1202()
{
    tc_knn_score(5, 50);
}

void tc1203()
{
    tc_knn_score(5, 100);
}

void tc1204()
{
    tc_knn_score(5, -1);
}

void tc1205()
{
    tc_knn_score(10, 10);
}

void tc1206()
{
    tc_knn_score(10, 50);
}

void tc1207()
{
    tc_knn_score(10, 100);
}

void tc1208()
{
    tc_knn_score(10, -1);
}

void tc1209()
{
    tc_knn_score(20, 10);
}

void tc1210()
{
    tc_knn_score(20, 50);
}

void tc1211()
{
    tc_knn_score(20, 100);
}

void tc1212()
{
    tc_knn_score(20, -1);
}

void tc1213()
{
    tc_knn_score(2, 10);
}

void tc1214()
{
    tc_knn_score(2, 50);
}

void tc1215()
{
    tc_knn_score(2, 100);
}

void tc1216()
{
    tc_knn_score(2, -1);
}

void tc1217()
{
    tc_knn_score(3, 10);
}

void tc1218()
{
    tc_knn_score(3, 50);
}

void tc1219()
{
    tc_knn_score(3, 100);
}

void tc1220()
{
    tc_knn_score(3, -1);
}
