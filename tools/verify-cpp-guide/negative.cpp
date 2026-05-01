#include <climits>
#include <iostream>
#include <string>
#include <vector>

const std::string& dangling_string_ref() {
    std::string s = "hello";
    return s;
}

int* dangling_int_ptr() {
    int x = 42;
    return &x;
}

int main(int argc, char** argv) {
    if (argc < 2) return 1;
    std::string which = argv[1];

    if (which == "use-after-free") {
        int* p = new int(42);
        delete p;
        std::cout << *p << '\n';
    } else if (which == "oob-vector") {
        std::vector<int> v = {1, 2, 3};
        std::cout << v[10] << '\n';
    } else if (which == "at-throws") {
        std::vector<int> v = {1, 2, 3};
        try {
            (void)v.at(10);
            return 2;
        } catch (const std::out_of_range&) {
            std::cout << "out_of_range\n";
            return 0;
        }
    } else if (which == "signed-overflow") {
        int x = INT_MAX;
        ++x;
        std::cout << x << '\n';
    } else if (which == "uninitialized") {
        int x;
        std::cout << x << '\n';
    } else if (which == "dangling-ref") {
        std::cout << dangling_string_ref() << '\n';
    } else if (which == "dangling-ptr") {
        std::cout << *dangling_int_ptr() << '\n';
    }
}
