// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef GPUDRIVERD3D11_HPP
#define GPUDRIVERD3D11_HPP

#include "../../D3D/ConstantBuffer.hpp"
#include "../../D3D/D3DClass.hpp"
#include "../../D3D/Shaders/PixelShader.hpp"
#include "../../D3D/Shaders/VertexShader.hpp"
#include "GPUDriverImpl.hpp"
#include "MapEntry.hpp"
#include <map>

namespace VE_Kernel
{
    class GPUDriverD3D11 : public GPUDriverImpl
    {
    public:
        GPUDriverD3D11(D3DClass* d3d_a);
        virtual void CreateTexture(uint32_t texture_id_a,
                                   ul::Ref<ul::Bitmap> bitmap_a) override;
        
        virtual void UpdateTexture(uint32_t texture_id_a,
                                   ul::Ref<ul::Bitmap> bitmap_a) override;
        
        virtual void DestroyTexture(uint32_t texture_id_a) override;
        virtual void CreateRenderBuffer(
                uint32_t render_buffer_id_a,
                const ul::RenderBuffer& buffer_a) override;
        
        virtual void DestroyRenderBuffer(uint32_t render_buffer_id_a) override;
        virtual void CreateGeometry(uint32_t geometry_id_a,
                                    const ul::VertexBuffer& vertices_a,
                                    const ul::IndexBuffer& indices_a) override;
        
        virtual void UpdateGeometry(uint32_t geometry_id_a,
                                    const ul::VertexBuffer& vertices_a,
                                    const ul::IndexBuffer& indices_a) override;
        
        virtual void DestroyGeometry(uint32_t geometry_id_a) override;
        void DrawGeometry(uint32_t geometry_id_a,
                          uint32_t index_count_a,
                          uint32_t index_offset_a,
                          const ul::GPUState& state_a) override;
        
        void ClearRenderBuffer(uint32_t render_buffer_id_a) override;
        ID3D11ShaderResourceView** GetAddressOfShaderResourceView(
                                    ul::RefPtr<ul::View>& view_a);

    private:
        void _LoadShaders();
        void _InitializeSamplerState();
        void _InitializeBlendStates();
        void _InitializeRasterizerStates();

        void _BindRenderBuffer(uint32_t render_buffer_id_a);
        void _SetViewport(uint32_t width_a, uint32_t height_a);
        void _BindTexture(uint8_t texture_unit_a, uint32_t texture_id_a);
        void _UpdateConstantBuffer(const ul::GPUState& state_a);
        void _BindGeometry(uint32_t geometry_id_a);
        ul::Matrix _ApplyProjection(const ul::Matrix4x4& transform_a,
                                    float screen_width_a,
                                    float screen_height_a);
        
     private:
        std::map<uint32_t, GeometryEntry> geometry_map_;
        std::map<uint32_t, RenderTargetEntry> render_target_map_;
        std::map<uint32_t, TextureEntry> texture_map_;
        VertexShader vs_fill_;
        VertexShader vs_fill_path_;
        PixelShader ps_fill_;
        PixelShader ps_fill_path_;
        ConstantBuffer<ConstantBufferType_Ultralight> constant_buffer_;
        ComPtr<ID3D11SamplerState> sampler_state_;
        ComPtr<ID3D11BlendState> blend_state_disable_blend_;
        ComPtr<ID3D11BlendState> blend_state_enable_blend_;
        ComPtr<ID3D11RasterizerState> rasterizer_state_default_;
        ComPtr<ID3D11RasterizerState> rasterizer_state_scissor_;

        D3DClass* d3d_ = nullptr;
    };
} // namespace VE_Kernel

#endif
