// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef FONTLOADERWIN_HPP
#define FONTLOADERWIN_HPP

#include <Ultralight/platform/FontLoader.h>
#include <map>

namespace ul = ultralight;

namespace VE_Kernel
{
    class FontLoaderWin : public ul::FontLoader
    {
    public:
        FontLoaderWin() {}
        virtual ~FontLoaderWin() {}
        
        virtual ul::String16 fallback_font() const override;
        virtual ul::String16 fallback_font_for_characters(
                const ul::String16& characters_a,
                int weight_a,
                bool italic_a) const override;
        
        virtual ul::RefPtr<ul::FontFile> Load(const ul::String16& family_a,
                                              int weight_a,
                                              bool italic_a) override;

    protected:
        std::map<uint32_t, ul::RefPtr<ul::Buffer>> fonts_;
    };
} // namespace VE_Kernel

#endif