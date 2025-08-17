// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef MIMETYPEHELPER_HPP
#define MIMETYPEHELPER_HPP

namespace VE_Kernel
{
    class MimeTypeHelper
    {
    public:
        static const char* FileExtensionToMimeTypeA(const char* ext_a);
        static const wchar_t* FileExtensionToMimeType(const wchar_t* ext_a);
    };
} // namespace VE_Kernel

#endif