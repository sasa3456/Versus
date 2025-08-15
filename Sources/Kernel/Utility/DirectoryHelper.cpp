#include "DirectoryHelper.hpp"
#include <Windows.h>

std::string DirectoryHelper::GetExecutableDirectoryA()
{
	if (executableDirectoryA != "")
		return executableDirectoryA;

	char szExecutablePath[MAX_PATH];
	GetModuleFileNameA(NULL, szExecutablePath, MAX_PATH);

	std::string executablePath(szExecutablePath);

	executableDirectoryA = executablePath.substr(0, executablePath.find_last_of("/\\")) + "/";
	executableDirectoryA = NormalizePathA(executableDirectoryA); //Replace \\ with /
	return executableDirectoryA;
}

std::wstring DirectoryHelper::GetExecutableDirectory()
{
    if (!executableDirectory.empty())
        return executableDirectory;

    // Используем буфер для широких символов
    wchar_t szExecutablePath[MAX_PATH];
    // Явный вызов Unicode-версии функции
    DWORD pathLength = GetModuleFileNameW(NULL, szExecutablePath, MAX_PATH);
    
    // Проверка на ошибки
    if (pathLength == 0 || pathLength >= MAX_PATH) {
        // Обработка ошибки: вернуть пустую строку или бросить исключение
        return L"";
    }

    std::wstring executablePath(szExecutablePath);
    executableDirectory = executablePath.substr(0, executablePath.find_last_of(L"/\\")) + L"/";
    executableDirectory = NormalizePath(executableDirectory);
    return executableDirectory;
}

std::string DirectoryHelper::NormalizePathA(std::string path_)
{
	if (!path_.empty())
	{
		for (size_t i = 0; i < path_.length(); ++i)
		{
			if (path_[i] == '\\')
				path_[i] = '/';
		}
	}
	return path_;
}

std::wstring DirectoryHelper::NormalizePath(std::wstring path_)
{
	if (!path_.empty())
	{
		for (size_t i = 0; i < path_.length(); ++i)
		{
			if (path_[i] == L'\\')
				path_[i] = L'/';
		}
	}
	return path_;
}

std::string DirectoryHelper::executableDirectoryA = "";
std::wstring DirectoryHelper::executableDirectory = L"";
