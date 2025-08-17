#include "ErrorHandler.hpp"
#include <comdef.h>

namespace VE_Kernel
{
    void ErrorHandler::LogCriticalError(const std::wstring& msg_a)
    {
        MessageBoxW(NULL, msg_a.c_str(), L"Critical Error", 0);
    }

    void ErrorHandler::LogCriticalError(HRESULT hr_a,
                                        const std::wstring& msg_a,
                                        const std::string& file_a,
                                        const std::string& function_a,
                                        int line_a)
    {}

    void ErrorHandler::LogFatalError(HRESULT hr_a,
                                     const std::wstring& msg_a,
                                     const std::string& file_a,
                                     const std::string& function_a,
                                     int line_a)
    {}

    void ErrorHandler::LogFatalError(const std::wstring& msg_a,
                                     const std::string& file_a,
                                     const std::string& function_a,
                                     int line_a)
    {
        std::wstring error_message_ = L"FATAL ERROR: ";
        error_message_ += msg_a;
        error_message_ += L"\n";

        std::wstring error_location_ = L"\n\nFile: ";
        error_location_ += StringHelper::StringToWide(file_a);
        error_location_ += L"\nFunction: ";
        error_location_ += StringHelper::StringToWide(function_a);
        error_location_ += L"\nLine: ";
        error_location_ += std::to_wstring(line_a);

        error_message_ += error_location_;

        MessageBoxW(NULL,
                    error_message_.c_str(),
                    L"Fatal Error",
                    0);
        exit(-1);
    }
} // namespace VE_Kernel