# Câu 1. ArrayShow
Define a function named ArrayShow to show elements of an integer array, size n.
Output elements separated by one space.

Starter:
void ArrayShow(int a[], int n) {
  // write your code here
}

Answer:
void ArrayShow(int a[], int n) {
  for (int i = 0; i < n; i++) cout << a[i] << (i + 1 == n ? "" : " ");
}

Test:
int n = 5;
int Arr[] = {1,2,3,4,5};
ArrayShow(Arr,n);
Expected:
1 2 3 4 5
---
Test:
int n = 5;
int Arr[] = {-1,2,-3,4,-5};
ArrayShow(Arr,n);
Expected:
-1 2 -3 4 -5

# Câu 2. SumArray
Define a function named SumArray that returns the sum of n integers in array a.

Starter:
int SumArray(int a[], int n) {
  // write your code here
}

Answer:
int SumArray(int a[], int n) {
  int s = 0;
  for (int i = 0; i < n; i++) s += a[i];
  return s;
}

Test:
int a[] = {1,2,3};
cout << SumArray(a,3);
Expected:
6
---
Test:
int a[] = {-2,5,7};
cout << SumArray(a,3);
Expected:
10
