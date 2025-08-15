#pragma once
#include "../../Editor/pch.hpp"

class ErrorHandler
{
public:
    static void LogCriticalError(const std::wstring& msg); // Изменено на wstring
    static void LogCriticalError(HRESULT hr, const std::wstring& msg, const std::string& file, const std::string& function, int line); // Изменено на wstring
    static void LogFatalError(HRESULT hr, const std::wstring& msg, const std::string& file, const std::string& function, int line); // Изменено на wstring
    static void LogFatalError(const std::wstring& msg, const std::string& file, const std::string& function, int line); // Изменено на wstring
};

// Обновленные макросы с использованием широких строк
#define ReturnFalseIfFail(hr, msg) if(FAILED(hr)) { ErrorHandler::LogCriticalError(hr, L##msg, __FILE__, __FUNCTION__, __LINE__); return false; }
#define FatalErrorIfFail(hr, msg) if(FAILED(hr)) { ErrorHandler::LogFatalError(hr, L##msg, __FILE__, __FUNCTION__, __LINE__); }
#define FatalError(msg) ErrorHandler::LogFatalError(L##msg, __FILE__, __FUNCTION__, __LINE__);