// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef TEXTANALYSISSOURCE_HPP
#define TEXTANALYSISSOURCE_HPP

#include <dwrite_3.h>

namespace VE_Kernel
{
    class TextAnalysisSource : public IDWriteTextAnalysisSource
    {
    public:
        IFACEMETHOD(QueryInterface)(IID const& iid_a, OUT void** pp_object_a)
        {
            if (iid_a == __uuidof(IDWriteTextAnalysisSource))
            {
                *pp_object_a = static_cast<IDWriteTextAnalysisSource*>(this);
                return S_OK;
            } 
            else if (iid_a == __uuidof(IUnknown))
            {
                *pp_object_a = static_cast<IUnknown*>(
                        static_cast<IDWriteTextAnalysisSource*>(this));
              
                return S_OK;
            } 
            else
            {
                return E_NOINTERFACE;
            }
        }

        IFACEMETHOD_(ULONG, AddRef)()
        {
            return InterlockedIncrement(&ref_value_);
        }

        IFACEMETHOD_(ULONG, Release)()
        {
            ULONG new_count_ = InterlockedDecrement(&ref_value_);
            if (new_count_ == 0)
                delete this;

            return new_count_;
        }

    public:
        TextAnalysisSource(const wchar_t* text_a,
                           UINT32 text_length_a,
                           const wchar_t* locale_name_a,
                           DWRITE_READING_DIRECTION reading_direction_a);

        ~TextAnalysisSource();

        IFACEMETHODIMP GetTextAtPosition(UINT32 text_position_a,
                                         OUT WCHAR const** text_string_a,
                                         OUT UINT32* text_length_a);

        IFACEMETHODIMP GetTextBeforePosition(UINT32 text_position_a,
                                             OUT WCHAR const** text_string_a,
                                             OUT UINT32* text_length_a);

        IFACEMETHODIMP_(DWRITE_READING_DIRECTION)
        GetParagraphReadingDirection() throw();

        IFACEMETHODIMP GetLocaleName(UINT32 text_position_a,
                                     OUT UINT32* text_length_a,
                                     OUT WCHAR const** locale_name_a);

        IFACEMETHODIMP
        GetNumberSubstitution(
                UINT32 text_position_a,
                OUT UINT32* text_length_a,
                OUT IDWriteNumberSubstitution** number_substitution_a);

    protected:
        UINT32 text_length_;
        const wchar_t* text_;
        const wchar_t* locale_name_;
        DWRITE_READING_DIRECTION reading_direction_;
        ULONG ref_value_;

    private:
        TextAnalysisSource(const TextAnalysisSource& b_a) = delete;
        TextAnalysisSource& operator=(TextAnalysisSource const&) = delete;
    };
} // namespace VE_Kernel

#endif
