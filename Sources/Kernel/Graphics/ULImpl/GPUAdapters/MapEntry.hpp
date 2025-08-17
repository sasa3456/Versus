// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef MAPENTRY_HPP
#define MAPENTRY_HPP

#include <Ultralight/KeyEvent.h>
#include <Ultralight/MouseEvent.h>
#include <Ultralight/Ultralight.h>

namespace ul = ultralight;

namespace VE_Kernel
{
    template <class T>
    using ComPtr = Microsoft::WRL::ComPtr<T>;

    struct GeometryEntry
    {
        ul::VertexBufferFormat format_;
        ComPtr<ID3D11Buffer> vertex_buffer_;
        ComPtr<ID3D11Buffer> index_buffer_;
    };

    struct TextureEntry
    {
        ComPtr<ID3D11Texture2D> texture_;
        ComPtr<ID3D11ShaderResourceView> texture_srv_;
        bool is_msaa_render_target_ = false;
        bool needs_resolve_ = false;
        ComPtr<ID3D11Texture2D> resolve_texture_;
        ComPtr<ID3D11ShaderResourceView> resolve_srv_;
    };

    struct RenderTargetEntry
    {
        ComPtr<ID3D11RenderTargetView> render_target_view_;
        uint32_t render_target_texture_id_;
    };
} // namespace VE_Kernel

#endif