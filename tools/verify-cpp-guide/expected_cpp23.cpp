#include <expected>
#include <string>

struct User { std::string name; };
enum class Error { None, NotFound, PermissionDenied };

std::expected<User, Error> load_user(int id) {
    if (id == 42) return User{"Ada"};
    return std::unexpected(Error::NotFound);
}

int main() {
    auto user = load_user(42);
    return user && user->name == "Ada" ? 0 : 1;
}
