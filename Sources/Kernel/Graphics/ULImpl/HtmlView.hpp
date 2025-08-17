// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef HTMLVIEW_HPP
#define HTMLVIEW_HPP

#include "FileSystems/FileSystemDefault.hpp"
#include "GPUAdapters/GPUDriverD3D11.hpp"
#include "../D3D/VertexBuffer.hpp"

#include "LoadListeners/HtmlViewLoadListener.hpp"
#include "ViewListeners/HtmlViewViewListener.hpp"

namespace VE_Kernel
{
    class HtmlView
    {
    public:
        HtmlView(GPUDriverD3D11* gpu_driver_a,
                 ul::RefPtr<ul::View> view_a,
                 VertexBuffer<Vertex_3pf_2tf>& vertex_buffer_a,
                 uint32_t width_a,
                 uint32_t height_a,
                 bool is_transparent_a = true);
        
        void LoadURL(std::string url_a);
        bool IsLoading();
        void FireMouseEvent(ul::MouseEvent mouse_event_a);
        void FireKeyboardEvent(ul::KeyEvent keyboard_event_a);
        void Focus();
        void SetSize(uint32_t width_a, uint32_t height_a);
        void SetPosition(float x_a, float y_a);
        
        DirectX::XMMATRIX GetWorldMatrix();
        ID3D11ShaderResourceView* const* GetAddressOfShaderResourceView();
        VertexBuffer<Vertex_3pf_2tf>* GetVertexBuffer();
        ~HtmlView();

    private:
        void _UpdateWorldMatrix();
        void _RegisterNativeCFunctions();
    
    private:
        DirectX::XMMATRIX world_matrix_ = DirectX::XMMatrixIdentity();
        VertexBuffer<Vertex_3pf_2tf>& vertex_buffer_;
        GPUDriverD3D11* gpu_driver_ = nullptr;
        ul::RefPtr<ul::View> view_;
        std::unique_ptr<HtmlViewLoadListener> view_load_listener_;
        std::unique_ptr<HtmlViewViewListener> view_view_listener_;

        uint32_t width_ = 0;
        uint32_t height_ = 0;
        DirectX::XMFLOAT2 position_ = {0, 0};
        bool is_transparent_ = false;
    };
} // namespace VE_Kernel

#endif