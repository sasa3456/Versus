#include "HtmlViewViewListener.hpp"
#include <Windows.h>

namespace VE_Kernel
{
    HtmlViewViewListener::HtmlViewViewListener()
    {
        cursor_hand_ = LoadCursor(NULL, IDC_HAND);
        cursor_arrow_ = LoadCursor(NULL, IDC_ARROW);
        cursor_ibeam_ = LoadCursor(NULL, IDC_IBEAM);
    }

    void HtmlViewViewListener::OnChangeTitle(ul::View* caller_a,
                                             const ul::String& title_a) {}

    void HtmlViewViewListener::OnChangeURL(ul::View* caller_a,
                                           const ul::String& url_a) {}

    void HtmlViewViewListener::OnChangeTooltip(ul::View* caller_a,
                                               const ul::String& tooltip_a) {}

    void HtmlViewViewListener::OnChangeCursor(ul::View* caller_a,
                                              ul::Cursor cursor_a)
    {
        switch (cursor_a)
        {
        case ultralight::kCursor_Hand: {
            SetCursor(cursor_hand_);
            break;
        }
        case ultralight::kCursor_Pointer: {
            SetCursor(cursor_arrow_);
            break;
        }
        case ultralight::kCursor_IBeam: {
            SetCursor(cursor_ibeam_);
            break;
        }
        }
    }

    void HtmlViewViewListener::OnAddConsoleMessage(ul::View* caller_a,
                                                   ul::MessageSource source_a,
                                                   ul::MessageLevel level_a,
                                                   const ul::String& message_a,
                                                   uint32_t line_number_a,
                                                   uint32_t column_number_a,
                                                   const ul::String& source_id_a)
    {
        OutputDebugStringA(message_a.utf8().data());
        OutputDebugStringA("\n");
    }
} // namespace VE_Kernel