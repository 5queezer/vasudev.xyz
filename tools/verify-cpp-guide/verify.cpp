#include <algorithm>
#include <any>
#include <array>
#include <atomic>
#include <cassert>
#include <chrono>
#include <climits>
#include <condition_variable>
#include <deque>
#include <exception>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <map>
#include <memory>
#include <mutex>
#include <numeric>
#include <optional>
#include <queue>
#include <set>
#include <span>
#include <stack>
#include <string>
#include <string_view>
#include <thread>
#include <unordered_map>
#include <unordered_set>
#include <variant>
#include <vector>
#include <concepts>

struct User {
    std::string name;
    int score = 0;
    int age = 0;

    User() = default;
    explicit User(std::string n) : name(std::move(n)) {}
    User(std::string n, int s) : name(std::move(n)), score(s) {}
    void name_fn() const {}
};

struct Item { int value = 0; };

int add(int a, int b) { return a + b; }
void risky() {}
void process_int(int) {}
void process_user(const User&) {}
int get_value() { return 42; }

std::optional<User> find_user(int id) {
    if (id == 42) return User{"Ada", 10};
    return std::nullopt;
}

User make_user() { return User{"Ada"}; }
std::unique_ptr<User> create_user() { return std::make_unique<User>("Ada"); }

void old_foundations_and_modern_model() {
    std::vector<std::string> names;
    char** raw_names = nullptr;
    (void)raw_names;

    auto user = std::make_unique<User>("Ada");
    auto raw_user = std::make_unique<User>("Ada");
    (void)user;
    (void)raw_user;

    std::vector<int> items{1, 2, 3};
    for (const auto& item : items) process_int(item);
    for (std::size_t i = 0; i < items.size(); ++i) process_int(items[i]);
}

void compilation_linking_examples() {
    assert(add(2, 3) == 5);
}

void lifetime_raii_examples() {
    { std::string name = "Ada"; (void)name; }
    auto user = std::make_unique<User>("Ada");
    (void)user;

    {
        std::ofstream file("/tmp/cxx-guide-verify-out.txt");
        file << "hello\n";
    }

    std::mutex m;
    {
        std::lock_guard<std::mutex> lock(m);
    }

    class FileHandle {
    public:
        FileHandle() = default;
        ~FileHandle() = default;
    };
    FileHandle fh;
    (void)fh;
}

void ownership_examples() {
    auto print_user_ptr = [](const User* user) {
        if (user) std::cout << user->name << '\n';
    };
    auto print_user_ref = [](const User& user) {
        std::cout << user.name << '\n';
    };

    User u{"Ada"};
    print_user_ptr(&u);
    print_user_ref(u);

    auto owned = std::make_unique<User>("Ada");
    auto take_user = [](std::unique_ptr<User> user) { assert(user); };
    take_user(std::move(owned));

    auto shared = std::make_shared<User>();
    std::weak_ptr<User> weak = shared;
    if (auto locked = weak.lock()) locked->name = "Ada";

    auto read = [](const User& user) { (void)user; };
    auto maybe_read = [](const User* user) { (void)user; };
    auto take = [](std::unique_ptr<User> user) { (void)user; };
    auto share = [](std::shared_ptr<User> user) { (void)user; };
    read(u);
    maybe_read(&u);
    take(std::make_unique<User>());
    share(shared);
}

void value_semantics_examples() {
    std::string a = "hello";
    std::string b = a;
    assert(a == b);

    class ValueUser {
    public:
        std::string name;
        std::vector<int> scores;
    };
    ValueUser vu;
    vu.scores.push_back(1);

    class BufferRule0 {
        std::vector<int> data;
    };
    BufferRule0 buffer;
    (void)buffer;

    class NonCopyable {
    public:
        NonCopyable() = default;
        NonCopyable(const NonCopyable&) = delete;
        NonCopyable& operator=(const NonCopyable&) = delete;
    };
    static_assert(!std::is_copy_constructible_v<NonCopyable>);
}

void move_semantics_examples() {
    std::string a = "hello";
    std::string b = std::move(a);
    assert(b == "hello");

    auto p = std::make_unique<User>();
    auto q = std::move(p);
    assert(!p && q);

    std::string name = "Ada";
    std::string tmp = std::string("Ada");
    (void)name;
    (void)tmp;

    class Buffer {
        std::vector<int> data;
    public:
        Buffer() = default;
        Buffer(Buffer&& other) noexcept : data(std::move(other.data)) {}
        Buffer& operator=(Buffer&& other) noexcept {
            data = std::move(other.data);
            return *this;
        }
    };
    Buffer x;
    Buffer y{std::move(x)};
    (void)y;

    const std::string ca = "hello";
    std::string cb = std::move(ca); // copies because source is const
    assert(cb == "hello");
}

void parameter_examples() {
    auto print = [](const std::string& s) { std::cout << s << '\n'; };
    auto update = [](User& user) { user.score += 1; };
    auto maybe_print = [](const User* user) { if (user) std::cout << user->name << '\n'; };
    auto set_age = [](int age) { (void)age; };

    class LocalUser {
        std::string name_;
    public:
        explicit LocalUser(std::string name) : name_(std::move(name)) {}
    };

    User u{"Ada"};
    print("hello");
    update(u);
    maybe_print(&u);
    set_age(42);
    LocalUser lu{"Ada"};
    (void)lu;
}

void stl_examples() {
    std::vector<int> values = {1, 2, 3};
    values.push_back(4);

    std::array<int, 3> fixed = {1, 2, 3};
    std::deque<int> dq;
    std::map<std::string, int> ordered;
    std::unordered_map<std::string, int> hashed;
    std::set<int> unique_sorted;
    std::unordered_set<int> unique_hashed;
    std::queue<int> q;
    std::stack<int> st;
    std::priority_queue<int> pq;
    (void)fixed; (void)dq; (void)ordered; (void)hashed; (void)unique_sorted;
    (void)unique_hashed; (void)q; (void)st; (void)pq;

    auto it = values.begin();
    std::cout << *it << '\n';

    std::vector<int> v = {1, 2, 3};
    int& ref = v[0];
    (void)ref;
    v.push_back(4);

    std::sort(values.begin(), values.end());
    auto found = std::find(values.begin(), values.end(), 42);
    auto count = std::count(values.begin(), values.end(), 7);
    (void)found; (void)count;

    std::vector<User> users{{"A", 2}, {"B", 1}};
    std::sort(users.begin(), users.end(), [](const User& lhs, const User& rhs) {
        return lhs.score < rhs.score;
    });

    values.erase(
        std::remove_if(values.begin(), values.end(), [](int x) { return x < 0; }),
        values.end()
    );
}

void modern_syntax_examples() {
    std::vector<User> users{{"Ada", 1}};
    auto count = users.size();
    auto x = get_value();
    (void)count; (void)x;

    for (const auto& user : users) std::cout << user.name << '\n';

    auto is_even = [](int x) { return x % 2 == 0; };
    assert(is_even(2));

    int threshold = 10;
    auto bigger = [threshold](int x) { return x > threshold; };
    auto f = [&threshold](int x) { return x > threshold; };
    assert(bigger(11) && f(11));

    User* user = nullptr;
    (void)user;

    enum class Status { Ok, Error, Unknown };
    Status s = Status::Ok;
    (void)s;

    User u{"Ada", 42};
    (void)u;

    constexpr auto square = [](int n) constexpr { return n * n; };
    constexpr int nine = square(3);
    static_assert(nine == 9);

    std::map<std::string, int> map;
    auto [inserted_it, inserted] = map.insert({"key", 42});
    (void)inserted_it; (void)inserted;

    std::unordered_map<int, User> user_map;
    user_map.emplace(42, User{"Ada"});
    int id = 42;
    if (auto found = user_map.find(id); found != user_map.end()) {
        assert(found->second.name == "Ada");
    }
}

void modern_library_examples() {
    if (auto user = find_user(42)) assert(user->name == "Ada");

    using Result = std::variant<int, std::string>;
    Result result = std::string{"ok"};
    std::visit([](const auto& value) { std::cout << value << '\n'; }, result);

    std::any value = 42;
    assert(std::any_cast<int>(value) == 42);

    auto print = [](std::string_view text) { std::cout << text << '\n'; };
    print("hello");

    std::vector<int> nums{1, 2, 3};
    auto inc = [](std::span<int> values) {
        for (int& n : values) ++n;
    };
    inc(nums);
    assert(nums[0] == 2);

    namespace fs = std::filesystem;
    for (const auto& entry : fs::directory_iterator("/tmp")) {
        (void)entry.path();
        break;
    }

    using namespace std::chrono_literals;
    auto timeout = 500ms;
    auto start = std::chrono::steady_clock::now();
    auto end = std::chrono::steady_clock::now();
    assert(timeout.count() == 500);
    assert(end >= start);
}

template <typename T>
T max_value(T a, T b) { return a < b ? b : a; }

template <typename T>
class Box {
    T value_;
public:
    explicit Box(T value) : value_(std::move(value)) {}
    const T& value() const { return value_; }
};

template <typename T>
void print_twice(const T& x) { std::cout << x << x; }

template <std::integral T>
T add_integral(T a, T b) { return a + b; }

void template_examples() {
    auto x = max_value(3, 7);
    auto y = max_value(2.5, 1.1);
    assert(x == 7 && y == 2.5);
    Box<int> a{42};
    Box<std::string> b{"hello"};
    assert(a.value() == 42 && b.value() == "hello");
    print_twice(3);
    assert(add_integral(2, 3) == 5);
}

void error_examples() {
    try {
        risky();
    } catch (const std::exception& e) {
        std::cerr << e.what() << '\n';
    }

    enum class Error { None, NotFound, PermissionDenied };
    Error e = Error::None;
    (void)e;
}

void concurrency_examples() {
    std::thread t([] { std::cout << "working\n"; });
    t.join();

    std::jthread jt([] {});

    std::mutex m;
    int counter = 0;
    {
        std::lock_guard<std::mutex> lock(m);
        ++counter;
    }

    {
        std::unique_lock<std::mutex> lock(m);
    }

    std::condition_variable cv;
    bool ready = false;
    std::mutex cv_m;
    std::jthread waiter([&] {
        std::unique_lock lock(cv_m);
        cv.wait(lock, [&] { return ready; });
    });
    {
        std::lock_guard lock(cv_m);
        ready = true;
    }
    cv.notify_one();

    std::atomic<int> atomic_counter = 0;
    ++atomic_counter;
    assert(atomic_counter == 1);
}

void performance_examples() {
    std::vector<User> users;
    std::vector<std::unique_ptr<User>> user_ptrs;
    (void)users; (void)user_ptrs;

    std::vector<Item> items;
    items.reserve(10);
    for (int i = 0; i < 10; ++i) {
        items.push_back(Item{i});
    }

    auto process = [](const std::vector<int>& values) { return std::accumulate(values.begin(), values.end(), 0); };
    assert(process({1, 2, 3}) == 6);

    class Holder {
        std::vector<int> data_;
    public:
        void set(std::vector<int> data) { this->data_ = std::move(data); }
    };
    Holder h;
    h.set({1, 2, 3});

    std::vector<int> v;
    v.reserve(1000);
    assert(v.capacity() >= 1000);
}

int main() {
    old_foundations_and_modern_model();
    compilation_linking_examples();
    lifetime_raii_examples();
    ownership_examples();
    value_semantics_examples();
    move_semantics_examples();
    parameter_examples();
    stl_examples();
    modern_syntax_examples();
    modern_library_examples();
    template_examples();
    error_examples();
    concurrency_examples();
    performance_examples();
    std::cout << "Modern C++ guide verification passed\n";
}
