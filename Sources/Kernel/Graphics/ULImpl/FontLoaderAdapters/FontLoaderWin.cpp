#include "FontLoaderWin.hpp"

#include "TextAnalysisSource.hpp"

#include <MLang.h>
#include <dwrite_3.h>
#include <memory>
#include <wrl.h>
#include <wrl/client.h>

using namespace Microsoft::WRL;
namespace ul = ultralight;

namespace VE_Kernel
{
    static DWRITE_FONT_WEIGHT ToDWriteFontWeight(LONG font_weight_a)
    {
        if (font_weight_a < LONG(150))
            return DWRITE_FONT_WEIGHT_THIN;
        if (font_weight_a < LONG(250))
            return DWRITE_FONT_WEIGHT_EXTRA_LIGHT;
        if (font_weight_a < LONG(350))
            return DWRITE_FONT_WEIGHT_LIGHT;
        if (font_weight_a < LONG(400))
            return DWRITE_FONT_WEIGHT_SEMI_LIGHT;
        if (font_weight_a < LONG(450))
            return DWRITE_FONT_WEIGHT_NORMAL;
        if (font_weight_a < LONG(550))
            return DWRITE_FONT_WEIGHT_MEDIUM;
        if (font_weight_a < LONG(650))
            return DWRITE_FONT_WEIGHT_SEMI_BOLD;
        if (font_weight_a < LONG(750))
            return DWRITE_FONT_WEIGHT_BOLD;
        if (font_weight_a < LONG(850))
            return DWRITE_FONT_WEIGHT_EXTRA_BOLD;
        if (font_weight_a < LONG(950))
            return DWRITE_FONT_WEIGHT_BLACK;
        
        return DWRITE_FONT_WEIGHT_EXTRA_BLACK;
    }

    ul::String16 FontLoaderWin::fallback_font() const
    {
        return "Arial";
    }

    ul::String16 FontLoaderWin::fallback_font_for_characters(
            const ul::String16& characters_a,
            int weight_a,
            bool italic_a) const
    {
        ComPtr<IDWriteFactory2> dwrite_factory_;

        HRESULT hr_ = DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED,
                                          __uuidof(IDWriteFactory2),
                                          &dwrite_factory_);

        if (FAILED(hr_))
            return fallback_font();

        wchar_t locale_name_[LOCALE_NAME_MAX_LENGTH];
        int success_ = GetUserDefaultLocaleName(locale_name_,
                                                LOCALE_NAME_MAX_LENGTH);
        
        if (!success_)
            return fallback_font();

        ComPtr<IDWriteFontFallback> font_fallback_;
        hr_ = dwrite_factory_->GetSystemFontFallback(&font_fallback_);

        if (FAILED(hr_))
            return fallback_font();

        TextAnalysisSource source_(characters_a.data(),
                                   (UINT32)characters_a.length(),
                                   locale_name_,
                                   DWRITE_READING_DIRECTION_LEFT_TO_RIGHT);

        UINT32 mapped_length_;
        ComPtr<IDWriteFont> mapped_font_;
        FLOAT font_scale_ = 1.0f;
        hr_ = font_fallback_->MapCharacters(&source_,
                                            0,
                                            (UINT32)characters_a.length(),
                                            nullptr,
                                            nullptr,
                                            ToDWriteFontWeight(weight_a),
                                            italic_a ? DWRITE_FONT_STYLE_ITALIC
                                                     : DWRITE_FONT_STYLE_NORMAL,
                                            DWRITE_FONT_STRETCH_NORMAL,
                                            &mapped_length_,
                                            &mapped_font_,
                                            &font_scale_);

        if (FAILED(hr_) || !mapped_font_)
            return fallback_font();

        ComPtr<IDWriteFontFamily> mapped_font_family_;
        hr_ = mapped_font_->GetFontFamily(&mapped_font_family_);

        if (FAILED(hr_))
            return fallback_font();

        IDWriteLocalizedStrings* family_names_ = NULL;
        hr_ = mapped_font_family_->GetFamilyNames(&family_names_);

        if (FAILED(hr_))
            return fallback_font();

        UINT32 index_ = 0;
        BOOL exists_ = false;
        hr_ = family_names_->FindLocaleName(locale_name_, &index_, &exists_);

        if (SUCCEEDED(hr_) && !exists_)
            hr_ = family_names_->FindLocaleName(L"en-us", &index_, &exists_);

        if (!exists_)
            index_ = 0;

        UINT32 name_length_ = 0;
        hr_ = family_names_->GetStringLength(index_, &name_length_);

        if (FAILED(hr_) || !name_length_)
            return fallback_font();

        std::unique_ptr<wchar_t[]> name_(new wchar_t[name_length_ + 1]);
        hr_ = family_names_->GetString(index_, name_.get(), name_length_ + 1);

        if (FAILED(hr_))
            return fallback_font();

        return ul::String16((const ul::Char16*)name_.get(), name_length_);
    }

    static ul::RefPtr<ul::FontFile> LoadFont(const ul::String16& family_a,
                                             int weight_a,
                                             bool italic_a)
    {
        ComPtr<IDWriteFactory> write_factory_;

        HRESULT hr_ = DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED,
                                          __uuidof(IDWriteFactory),
                                          &write_factory_);

        if (FAILED(hr_))
            return nullptr;

        ComPtr<IDWriteFontCollection> font_collection_;
        hr_ = write_factory_->GetSystemFontCollection(&font_collection_);

        if (FAILED(hr_))
            return nullptr;

        UINT32 index_ = 0;
        BOOL exists_ = false;
        size_t len_ = family_a.length() + 1;
        WCHAR* family_name_wcstr_ = new WCHAR[len_];
        memset(family_name_wcstr_, 0, sizeof(WCHAR) * len_);
        memcpy(family_name_wcstr_, family_a.data(), sizeof(WCHAR) * (len_ - 1));
        hr_ = font_collection_->FindFamilyName(family_name_wcstr_,
                                               &index_,
                                               &exists_);

        delete[] family_name_wcstr_;

        if (FAILED(hr_) || !exists_)
            return nullptr;

        ComPtr<IDWriteFontFamily> font_family_;
        hr_ = font_collection_->GetFontFamily(index_, &font_family_);

        if (FAILED(hr_) || font_family_->GetFontCount() == 0)
            return nullptr;

        ComPtr<IDWriteFont> font_;
        hr_ = font_family_->GetFirstMatchingFont(
                ToDWriteFontWeight(weight_a),
                DWRITE_FONT_STRETCH_NORMAL,
                italic_a ? DWRITE_FONT_STYLE_ITALIC : DWRITE_FONT_STYLE_NORMAL,
                &font_);

        if (FAILED(hr_))
            return nullptr;

        ComPtr<IDWriteFontFace> font_face_;
        hr_ = font_->CreateFontFace(&font_face_);

        if (FAILED(hr_))
            return nullptr;

        UINT32 num_files_ = 0;
        hr_ = font_face_->GetFiles(&num_files_, nullptr);

        if (FAILED(hr_) || num_files_ == 0)
            return nullptr;

        if (num_files_ > 1)
            return nullptr;

        ComPtr<IDWriteFontFile> font_file_;
        hr_ = font_face_->GetFiles(&num_files_, &font_file_);

        if (FAILED(hr_))
            return nullptr;

        BOOL is_supported_font_type_ = false;
        DWRITE_FONT_FILE_TYPE font_file_type_;
        DWRITE_FONT_FACE_TYPE font_face_type_;
        UINT32 number_of_faces_;
        hr_ = font_file_->Analyze(&is_supported_font_type_,
                                  &font_file_type_,
                                  &font_face_type_,
                                  &number_of_faces_);

        if (FAILED(hr_) || !is_supported_font_type_)
            return nullptr;

        const void* reference_key_;
        UINT32 ref_key_size_;
        hr_ = font_file_->GetReferenceKey(&reference_key_, &ref_key_size_);

        if (FAILED(hr_))
            return nullptr;

        ComPtr<IDWriteFontFileLoader> font_file_loader_;
        hr_ = font_file_->GetLoader(&font_file_loader_);

        if (FAILED(hr_))
            return nullptr;

        IDWriteLocalFontFileLoader* local_file_loader_ = NULL;
        hr_ = font_file_loader_->QueryInterface(
                    __uuidof(IDWriteLocalFontFileLoader),
                    (void**)&local_file_loader_);

        if (SUCCEEDED(hr_))
        {
            UINT32 path_length_ = 0;
            hr_ = local_file_loader_->GetFilePathLengthFromKey(reference_key_,
                                                               ref_key_size_,
                                                               &path_length_);

            if (FAILED(hr_))
                return nullptr;

            WCHAR* path_ = new WCHAR[path_length_ + 1];

            hr_ = local_file_loader_->GetFilePathFromKey(reference_key_,
                                                         ref_key_size_,
                                                         path_,
                                                         path_length_ + 1);
            if (FAILED(hr_))
                return nullptr;

            ul::String16 path_str_(path_, path_length_);
            return ul::FontFile::Create(path_str_);
        }

        ComPtr<IDWriteFontFileStream> font_filestream_;
        hr_ = font_file_loader_->CreateStreamFromKey(reference_key_,
                                                     ref_key_size_,
                                                     &font_filestream_);

        if (FAILED(hr_))
            return nullptr;

        UINT64 file_size_ = 0;
        hr_ = font_filestream_->GetFileSize(&file_size_);

        if (FAILED(hr_))
            return nullptr;

        const void* fragment_start_;
        void* context_;
        hr_ = font_filestream_->ReadFileFragment(&fragment_start_,
                                                 0,
                                                 file_size_,
                                                 &context_);

        if (FAILED(hr_))
            return nullptr;

        ul::Ref<ul::Buffer> result_ = ul::Buffer::Create(fragment_start_,
                                                         (size_t)file_size_);

        font_filestream_->ReleaseFileFragment(context_);
        return ul::FontFile::Create(result_);
    }

    ul::RefPtr<ul::FontFile> FontLoaderWin::Load(const ul::String16& family_a,
                                                 int weight_a,
                                                 bool italic_a)
    {
        return LoadFont(family_a, weight_a, italic_a);
    }
} // namespace VE_Kernel
