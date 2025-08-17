#include "DirectoryHelper.hpp"
#include <Windows.h>

namespace VE_Kernel
{
    std::string DirectoryHelper::GetExecutableDirectoryA()
    {
        if (executable_directory_a_ != "")
            return executable_directory_a_;

        char sz_executable_path_[MAX_PATH];
        GetModuleFileNameA(NULL, sz_executable_path_, MAX_PATH);

        std::string executable_path_(sz_executable_path_);

        executable_directory_a_ =
                executable_path_.substr(0, executable_path_.find_last_of("/\\"))
                + "/";

        executable_directory_a_ = NormalizePathA(executable_directory_a_);

        return executable_directory_a_;
    }

    std::wstring DirectoryHelper::GetExecutableDirectory()
    {
        if (!executable_directory_.empty())
            return executable_directory_;

        wchar_t sz_executable_path_[MAX_PATH];
        DWORD path_length_ = GetModuleFileNameW(NULL, sz_executable_path_, MAX_PATH);

        if (path_length_ == 0 || path_length_ >= MAX_PATH)
        {
            return L"";
        }

        std::wstring executable_path_(sz_executable_path_);
        executable_directory_ =
                executable_path_.substr(0, 
                executable_path_.find_last_of(L"/\\")) + L"/";
        
        executable_directory_ = NormalizePath(executable_directory_);
        return executable_directory_;
    }

    std::string DirectoryHelper::NormalizePathA(std::string path_a)
    {
        if (!path_a.empty())
        {
            for (size_t i_ = 0; i_ < path_a.length(); ++i_)
            {
                if (path_a[i_] == '\\')
                    path_a[i_] = '/';
            }
        }
        return path_a;
    }

    std::wstring DirectoryHelper::NormalizePath(std::wstring path_a)
    {
        if (!path_a.empty())
        {
            for (size_t i_ = 0; i_ < path_a.length(); ++i_)
            {
                if (path_a[i_] == L'\\')
                    path_a[i_] = L'/';
            }
        }
        return path_a;
    }

    std::string DirectoryHelper::executable_directory_a_ = "";
    std::wstring DirectoryHelper::executable_directory_ = L"";
} // namespace VE_Kernel 