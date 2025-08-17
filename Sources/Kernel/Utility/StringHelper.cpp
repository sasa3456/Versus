#include "StringHelper.hpp"
#include <Windows.h>

namespace VE_Kernel
{
    std::wstring StringHelper::StringToWide(const std::string& str_a)
    {
        if (str_a.empty())
            return L"";
        
        int size_ = MultiByteToWideChar(CP_UTF8,
                                       0,
                                       &str_a[0],
                                       (int)str_a.size(),
                                       NULL,
                                       0);
        
        std::wstring result_(size_, 0);
        MultiByteToWideChar(CP_UTF8,
                            0,
                            &str_a[0],
                            (int)str_a.size(),
                            &result_[0],
                            size_);
        
        return result_;
    }
} // namespace VE_Kernel