#include "FileSystemDefault.hpp"

#include "../../../Utility/DirectoryHelper.hpp"
#include "../../../Utility/MimeTypeHelper.hpp"

#include <Ultralight\String.h>

namespace VE_Kernel
{
    FileSystemDefault::FileSystemDefault(std::string base_directory_a)
    {
        if (base_directory_a != "")
        {
            base_directory_ = base_directory_a;
        } 
        else
        {
            base_directory_ = DirectoryHelper::GetExecutableDirectoryA();
        }
    }

    FileSystemDefault::~FileSystemDefault() {}

    bool FileSystemDefault::FileExists(const ul::String16& path_a)
    {
        std::string fullpath_ = _GetRelativePath(path_a);
        std::ifstream filestream_(fullpath_);
        
        return filestream_.good();
    }

    bool FileSystemDefault::GetFileSize(ul::FileHandle handle_a,
                                        int64_t& result_a)
    {
        auto iter_ = open_files_.find(handle_a);
        if (iter_ != open_files_.end())
        {
            auto& file_ = iter_->second;
            file_->seekg(0, file_->end);
            
            result_a = (int64_t)file_->tellg();
            return true;
        }

        return false;
    }

    bool FileSystemDefault::GetFileMimeType(const ul::String16& path_a,
                                            ul::String16& result_a)
    {
        ul::String8 utf8_ = ul::String(path_a).utf8();
        std::string filepath_(utf8_.data(), utf8_.length());
        std::string ext_ = filepath_.substr(filepath_.find_last_of(".") + 1);
        
        result_a = ul::String16(
                   MimeTypeHelper::FileExtensionToMimeTypeA(ext_.c_str()));
        
        return true;
    }

    ul::FileHandle FileSystemDefault::OpenFile(const ul::String16& path_a,
                                               bool open_for_writing_a)
    {
        std::string fullpath_ = _GetRelativePath(path_a);
        std::unique_ptr<std::ifstream> file_(
                new std::ifstream(fullpath_,
                                  std::ifstream::ate | std::ifstream::binary));
        
        if (!file_->good())
            return ul::invalidFileHandle;

        ul::FileHandle handle_ = next_file_handle_++;
        open_files_[handle_] = std::move(file_);
        
        return handle_;
    }

    void FileSystemDefault::CloseFile(ul::FileHandle& handle_a)
    {
        open_files_.erase(handle_a);
        handle_a = ul::invalidFileHandle;
    }

    int64_t FileSystemDefault::ReadFromFile(ul::FileHandle handle_a,
                                            char* data_a,
                                            int64_t length_a)
    {
        auto iter_ = open_files_.find(handle_a);
        if (iter_ != open_files_.end())
        {
            auto& file_ = iter_->second;
            file_->seekg(0, file_->beg);
            file_->read(data_a, (std::streamsize)length_a);
            
            return (int64_t)file_->gcount();
        }
        
        return int64_t();
    }

    std::string FileSystemDefault::_GetRelativePath(
            const ul::String16& filepath_a)
    {
        ul::String8 utf8_ = ul::String(filepath_a).utf8();
        std::string relative_path_(utf8_.data(), utf8_.length());
        std::string fullpath_ = base_directory_ + relative_path_;
        
        return fullpath_;
    }
} // namespace VE_Kernel
