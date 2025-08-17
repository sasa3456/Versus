// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef ERRORHANDLER_HPP
#define ERRORHANDLER_HPP

#include <wrl/client.h>
#include "StringHelper.hpp"

namespace VE_Kernel
{
    class ErrorHandler
    {
    public:
        static void LogCriticalError(const std::wstring& msg_a);
        static void LogCriticalError(HRESULT hr_a,
                                     const std::wstring& msg_a,
                                     const std::string& file_a,
                                     const std::string& function_a,
                                     int line_a);

        static void LogFatalError(HRESULT hr_a,
                                  const std::wstring& msg_a,
                                  const std::string& file_a,
                                  const std::string& function_a,
                                  int line_a);
        
        static void LogFatalError(const std::wstring& msg_a,
                                  const std::string& file_a,
                                  const std::string& function_a,
                                  int line_a);
    };

#define ReturnFalseIfFail(hr, msg)                                             \
    if (FAILED(hr))                                                            \
    {                                                                          \
        ErrorHandler::LogCriticalError(hr,                                     \
                                       L##msg,                                 \
                                       __FILE__,                               \
                                       __FUNCTION__,                           \
                                       __LINE__);                              \
        return false;                                                          \
    }

#define FatalErrorIfFail(hr, msg)                                              \
    if (FAILED(hr))                                                            \
    {                                                                          \
        ErrorHandler::LogFatalError(hr,                                        \
                                    L##msg,                                    \
                                    __FILE__,                                  \
                                    __FUNCTION__,                              \
                                    __LINE__);                                 \
    }

#define FatalError(msg)                                                        \
    ErrorHandler::LogFatalError(L##msg, __FILE__, __FUNCTION__, __LINE__);
} // namespace VE_Kernel

#endif