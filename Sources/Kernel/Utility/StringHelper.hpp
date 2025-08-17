// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef STRINGHELPER_HPP
#define STRINGHELPER_HPP

#include <string>

namespace VE_Kernel
{
    class StringHelper
    {
    public:
        static std::wstring StringToWide(const std::string& str_a);
    };
} // namespace VE_Kernel

#endif