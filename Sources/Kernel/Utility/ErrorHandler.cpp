#include "ErrorHandler.hpp"
#include <comdef.h>

void ErrorHandler::LogCriticalError(const std::wstring& msg_)
{
    MessageBoxW(NULL, msg_.c_str(), L"Critical Error", 0);
}

void ErrorHandler::LogCriticalError(HRESULT hr_, const std::wstring& msg_, const std::string& file_, const std::string& function_, int line_)
{

}

void ErrorHandler::LogFatalError(HRESULT hr_, const std::wstring& msg_, const std::string& file_, const std::string& function_, int line_)
{
  
}

void ErrorHandler::LogFatalError(const std::wstring& msg_, const std::string& file_, const std::string& function_, int line_)
{
    std::wstring errorMessage = L"FATAL ERROR: ";
    errorMessage += msg_;
    errorMessage += L"\n";

    std::wstring errorLocation = L"\n\nFile: ";
    errorLocation += StringHelper::StringToWide(file_);
    errorLocation += L"\nFunction: ";
    errorLocation += StringHelper::StringToWide(function_);
    errorLocation += L"\nLine: ";
    errorLocation += std::to_wstring(line_);

    errorMessage += errorLocation;

    MessageBoxW(NULL, errorMessage.c_str(), L"Fatal Error", 0); // Используем MessageBoxW
    exit(-1);
}