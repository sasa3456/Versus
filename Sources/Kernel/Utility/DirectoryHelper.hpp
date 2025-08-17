// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef DIRECTORYHELPER_HPP
#define DIRECTORYHELPER_HPP

#include <string>

namespace VE_Kernel
{
    class DirectoryHelper
    {
    public:
        static std::string GetExecutableDirectoryA();
        static std::wstring GetExecutableDirectory();
        static std::string NormalizePathA(std::string path_a);
        static std::wstring NormalizePath(std::wstring path_a);

    private:
        static std::string executable_directory_a_;
        static std::wstring executable_directory_;
    };
} // namespace VE_Kernel

#endif