// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef FILESYSTEMDEFAULT_HPP
#define FILESYSTEMDEFAULT_HPP

#include <Ultralight/KeyEvent.h>
#include <Ultralight/MouseEvent.h>
#include <Ultralight/Ultralight.h>

#include <fstream>
#include <map>

namespace ul = ultralight;
namespace VE_Kernel
{
    class FileSystemDefault : public ul::FileSystem
    {
    public:
        FileSystemDefault(std::string base_dir_a = "");
        virtual ~FileSystemDefault();
        
        virtual bool FileExists(const ul::String16& path_a) override;
        virtual bool GetFileSize(ul::FileHandle handle_a,
                                 int64_t& result_a) override;
        
        virtual bool GetFileMimeType(const ul::String16& path_a,
                                     ul::String16& result_a) override;
        
        virtual ul::FileHandle OpenFile(const ul::String16& path_a,
                                        bool open_for_writing_a) override;
        
        virtual void CloseFile(ul::FileHandle& handle_a) override;
        virtual int64_t ReadFromFile(ul::FileHandle handle_a,
                                     char* data_a,
                                     int64_t length_a) override;

    private:
        std::string _GetRelativePath(const ul::String16& filePath);
        
    private:
        std::string base_directory_ = "";
        ul::FileHandle next_file_handle_ = 0;
        std::map<ul::FileHandle, std::unique_ptr<std::ifstream>> open_files_;
    };
} // namespace VE_Kernel

#endif
