#include "TextAnalysisSource.hpp"

namespace VE_Kernel
{
    TextAnalysisSource::TextAnalysisSource(
            const wchar_t* text_a,
            UINT32 text_length_a,
            const wchar_t* locale_name_a,
            DWRITE_READING_DIRECTION reading_direction_a)
            : text_(text_a), text_length_(text_length_a), 
              locale_name_(locale_name_a),
              reading_direction_(reading_direction_a), ref_value_(0) {}

    TextAnalysisSource::~TextAnalysisSource() {}

    IFACEMETHODIMP
    TextAnalysisSource::GetTextAtPosition(UINT32 text_position_a,
                                          OUT WCHAR const** text_string_a,
                                          OUT UINT32* text_length_a)
    {
        if (text_position_a >= text_length_)
        {
            *text_string_a = NULL;
            *text_length_a = 0;
        } 
        else
        {
            *text_string_a = text_ + text_position_a;
            *text_length_a = text_length_ - text_position_a;
        }

        return S_OK;
    }

    IFACEMETHODIMP
    TextAnalysisSource::GetTextBeforePosition(UINT32 text_position_a,
                                              OUT WCHAR const** text_string_a,
                                              OUT UINT32* text_length_a)
    {
        if (text_position_a == 0 || text_position_a > text_length_)
        {
            *text_string_a = NULL;
            *text_length_a = 0;
        } 
        else
        {
            *text_string_a = text_;
            *text_length_a = text_position_a;
        }

        return S_OK;
    }

    DWRITE_READING_DIRECTION STDMETHODCALLTYPE
    TextAnalysisSource::GetParagraphReadingDirection()
    {
        return reading_direction_;
    }

    IFACEMETHODIMP
    TextAnalysisSource::GetLocaleName(UINT32 text_position_a,
                                      OUT UINT32* text_length_a,
                                      OUT WCHAR const** locale_name_a)
    {
        *locale_name_a = locale_name_;
        *text_length_a = text_length_ - text_position_a;
        
        return S_OK;
    }

    IFACEMETHODIMP
    TextAnalysisSource::GetNumberSubstitution(
            UINT32 text_position_a,
            OUT UINT32* text_length_a,
            OUT IDWriteNumberSubstitution** number_substitution_a)
    {
        *number_substitution_a = NULL;
        *text_length_a = text_length_ - text_position_a;
        return S_OK;
    }
} // namespace VE_Kernel
