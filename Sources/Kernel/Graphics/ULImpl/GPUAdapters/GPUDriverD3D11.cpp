#include "GPUDriverD3D11.hpp"
#include "../../D3D/InputLayoutDescriptions.hpp"

namespace VE_Kernel
{
    GPUDriverD3D11::GPUDriverD3D11(D3DClass* d3d_a)
    {
        d3d_ = d3d_a;
        _LoadShaders();
        _InitializeSamplerState();
        _InitializeBlendStates();
        _InitializeRasterizerStates();

        HRESULT hr_ = constant_buffer_.Initialize(d3d_->device_.Get(),
                                                  d3d_->device_context_.Get());
        FatalErrorIfFail(hr_,
                         "GPUDriverD3D11::GPUDriverD3D11 failed to initialize "
                         "constant buffer.");
    }

    void GPUDriverD3D11::CreateTexture(uint32_t texture_id_a,
                                       ul::Ref<ul::Bitmap> bitmap_a)
    {
        auto i_ = texture_map_.find(texture_id_a);
        if (i_ != texture_map_.end())
            FatalError(
                    "GPUDriverD3D11::CreateTexture, texture id already "
                    "exists.");

        if (!(bitmap_a->format() == ul::kBitmapFormat_BGRA8_UNORM_SRGB
            || bitmap_a->format() == ul::kBitmapFormat_A8_UNORM))
            FatalError("GPUDriverD3D11::CreateTexture, unsupported format.");

        D3D11_TEXTURE2D_DESC desc_ = {};
        desc_.Width = bitmap_a->width();
        desc_.Height = bitmap_a->height();
        desc_.MipLevels = desc_.ArraySize = 1;
        desc_.Format = bitmap_a->format() == ul::kBitmapFormat_BGRA8_UNORM_SRGB
                                           ? DXGI_FORMAT_B8G8R8A8_UNORM_SRGB
                                           : DXGI_FORMAT_A8_UNORM;
        desc_.SampleDesc.Count = 1;
        desc_.Usage = D3D11_USAGE_DYNAMIC;
        desc_.BindFlags = D3D11_BIND_SHADER_RESOURCE;
        desc_.CPUAccessFlags = D3D11_CPU_ACCESS_WRITE;
        desc_.MiscFlags = 0;

        auto& texture_entry_ = texture_map_[texture_id_a];
        HRESULT hr_;

        if (bitmap_a->IsEmpty())
        {
            desc_.BindFlags = D3D11_BIND_RENDER_TARGET
                            | D3D11_BIND_SHADER_RESOURCE;
            desc_.Usage = D3D11_USAGE_DEFAULT;
            desc_.CPUAccessFlags = 0;

#if ENABLE_MSAA
            desc_.SampleDesc.Count = 8;
            desc_.SampleDesc.Quality = D3D11_STANDARD_MULTISAMPLE_PATTERN;

            texture_entry_.is_msaa_render_target_ = true;
#endif

            hr_ = d3d_->device_->CreateTexture2D(&desc_,
                                                 NULL,
                                                 &texture_entry_.texture_);
        } 
        else
        {
            D3D11_SUBRESOURCE_DATA texture_data_;
            ZeroMemory(&texture_data_, sizeof(texture_data_));
            texture_data_.pSysMem = bitmap_a->LockPixels();
            texture_data_.SysMemPitch = bitmap_a->row_bytes();
            texture_data_.SysMemSlicePitch = (UINT)bitmap_a->size();

            hr_ = d3d_->device_->CreateTexture2D(&desc_,
                                                 &texture_data_,
                                                 &texture_entry_.texture_);
            bitmap_a->UnlockPixels();
        }

        FatalErrorIfFail(
                hr_,
                "GPUDriverD3D11::CreateTexture, unable to create texture.");

        D3D11_SHADER_RESOURCE_VIEW_DESC srv_desc_;
        ZeroMemory(&srv_desc_, sizeof(srv_desc_));
        srv_desc_.Format = desc_.Format;
        srv_desc_.ViewDimension = texture_entry_.is_msaa_render_target_
                                ? D3D11_SRV_DIMENSION_TEXTURE2DMS
                                : D3D11_SRV_DIMENSION_TEXTURE2D;
        
        srv_desc_.Texture2D.MostDetailedMip = 0;
        srv_desc_.Texture2D.MipLevels = 1;

        hr_ = d3d_->device_->
              CreateShaderResourceView(texture_entry_.texture_.Get(),
                                       &srv_desc_,
                                       &texture_entry_.texture_srv_);
        
        FatalErrorIfFail(hr_,
                         "GPUDriverD3D11::CreateTexture, unable to create "
                         "shader resource view for texture.");

#if ENABLE_MSAA
        if (texture_entry_.is_msaa_render_target_)
        {
            desc_.SampleDesc.Count = 1;
            desc_.SampleDesc.Quality = 0;
            hr_ = d3d_a->device_->CreateTexture2D(
                                         &desc_,
                                         NULL,
                                         &texture_entry_.resolve_texture_);
            
            FatalErrorIfFail(hr_,
                             "GPUDriverD3D11::CreateTexture, unable to create "
                             "MSAA resolve texture.");

            srv_desc_.ViewDimension = D3D11_SRV_DIMENSION_TEXTURE2D;

            hr_ = d3d_a->device_->CreateShaderResourceView(
                                  texture_entry_.resolve_texture_.Get(),
                                  &srv_desc_,
                                  &texture_entry_.resolve_srv_);
           
            FatalErrorIfFail(hr_,
                             "GPUDriverD3D11::CreateTexture, unable to create "
                             "shader resource view for MSAA resolve texture.");
        }
#endif
    }

    void GPUDriverD3D11::UpdateTexture(uint32_t texture_id_a,
                                       ul::Ref<ul::Bitmap> bitmap_a)
    {
        auto iter_ = texture_map_.find(texture_id_a);
        if (iter_ == texture_map_.end())
            FatalError(
                    "GPUDriverD3D11::UpdateTexture, texture id doesn't exist.");

        auto& entry_ = iter_->second;
        D3D11_MAPPED_SUBRESOURCE res_;
        d3d_->device_context_->Map(entry_.texture_.Get(),
                                   0,
                                   D3D11_MAP_WRITE_DISCARD,
                                   0,
                                   &res_);

        if (res_.RowPitch == bitmap_a->row_bytes())
        {
            memcpy(res_.pData, bitmap_a->LockPixels(), bitmap_a->size());
            bitmap_a->UnlockPixels();
        } 
        else
        {
            ul::Ref<ul::Bitmap> mapped_bitmap_ =
                    ul::Bitmap::Create(bitmap_a->width(),
                                       bitmap_a->height(),
                                       bitmap_a->format(),
                                       res_.RowPitch,
                                       res_.pData,
                                       res_.RowPitch * bitmap_a->height(),
                                       false);
            
            ul::IntRect dest_rect_ = {0,
                                      0,
                                      (int)bitmap_a->width(),
                                      (int)bitmap_a->height()};
            
            mapped_bitmap_->DrawBitmap(dest_rect_, dest_rect_, bitmap_a, false);
        }

        d3d_->device_context_->Unmap(entry_.texture_.Get(), 0);
    }

    void GPUDriverD3D11::DestroyTexture(uint32_t texture_id_a)
    {
        auto iter_ = texture_map_.find(texture_id_a);
        if (iter_ != texture_map_.end())
        {
            texture_map_.erase(iter_);
        }
    }

    void GPUDriverD3D11::CreateRenderBuffer(uint32_t render_buffer_id_a,
                                            const ul::RenderBuffer& buffer_a)
    {
        if (render_buffer_id_a == 0)
            FatalError(
                    "GPUDriverD3D11::CreateRenderBuffer, render buffer ID 0 is "
                    "reserved for default render target view.");

        auto i_ = render_target_map_.find(render_buffer_id_a);
        if (i_ != render_target_map_.end())
            FatalError(
                    "GPUDriverD3D11::CreateRenderBuffer, render buffer id "
                    "already exists.");

        auto texture_entry_ = texture_map_.find(buffer_a.texture_id);
        if (texture_entry_ == texture_map_.end())
            FatalError(
                    "GPUDriverD3D11::CreateRenderBuffer, texture id doesn't "
                    "exist.");

        D3D11_RENDER_TARGET_VIEW_DESC render_target_view_desc_ = {};
        render_target_view_desc_.Format = DXGI_FORMAT_B8G8R8A8_UNORM_SRGB;
        render_target_view_desc_.ViewDimension = D3D11_RTV_DIMENSION_TEXTURE2D;

#if ENABLE_MSAA
        render_target_view_desc_.ViewDimension = D3D11_RTV_DIMENSION_TEXTURE2DMS;
#endif

        ComPtr<ID3D11Texture2D> tex_ = texture_entry_->second.texture_;
        auto& render_target_entry_ = render_target_map_[render_buffer_id_a];
        HRESULT hr_ = d3d_->device_->CreateRenderTargetView(
                    tex_.Get(),
                    &render_target_view_desc_,
                    render_target_entry_.render_target_view_.GetAddressOf());

        render_target_entry_.render_target_texture_id_ = buffer_a.texture_id;
        FatalErrorIfFail(hr_,
                         "GPUDriverD3D11::CreateRenderBuffer, unable to create "
                         "render target.");
    }

    void GPUDriverD3D11::DestroyRenderBuffer(uint32_t render_buffer_id_a)
    {
        auto iter_ = render_target_map_.find(render_buffer_id_a);
        if (iter_ != render_target_map_.end())
        {
            iter_->second.render_target_view_.Reset();
            render_target_map_.erase(iter_);
        }
    }

    void GPUDriverD3D11::CreateGeometry(uint32_t geometry_id_a,
                                        const ul::VertexBuffer& vertices_a,
                                        const ul::IndexBuffer& indices_a)
    {
        if (geometry_map_.find(geometry_id_a) != geometry_map_.end())
            FatalError(
                    "GPUDriverD3D11::CreateGeometry called with a geometry id "
                    "that already exists.");

        GeometryEntry geometry_;
        geometry_.format_ = vertices_a.format;

        HRESULT hr_;

        D3D11_BUFFER_DESC vertex_desc_ = {};
        vertex_desc_.Usage = D3D11_USAGE_DYNAMIC;
        vertex_desc_.ByteWidth = vertices_a.size;
        vertex_desc_.BindFlags = D3D11_BIND_VERTEX_BUFFER;
        vertex_desc_.CPUAccessFlags = D3D11_CPU_ACCESS_WRITE;

        D3D11_SUBRESOURCE_DATA vertex_data_ = {};
        vertex_data_.pSysMem = vertices_a.data;

        hr_ = d3d_->device_->CreateBuffer(&vertex_desc_,
                                          &vertex_data_,
                                          geometry_.vertex_buffer_.GetAddressOf());
        FatalErrorIfFail(hr_,
                         "GPUDriverD3D11::CreateGeometry CreateBuffer for "
                         "vertex buffer failed.");

        D3D11_BUFFER_DESC index_desc_ = {};
        index_desc_.Usage = D3D11_USAGE_DYNAMIC;
        index_desc_.ByteWidth = indices_a.size;
        index_desc_.BindFlags = D3D11_BIND_INDEX_BUFFER;
        index_desc_.CPUAccessFlags = D3D11_CPU_ACCESS_WRITE;

        D3D11_SUBRESOURCE_DATA index_data_ = {};
        index_data_.pSysMem = indices_a.data;

        hr_ = d3d_->device_->CreateBuffer(&index_desc_,
                                          &index_data_,
                                          geometry_.index_buffer_.GetAddressOf());
        
        FatalErrorIfFail(hr_,
                         "GPUDriverD3D11::CreateGeometry CreateBuffer for "
                         "index buffer failed.");

        geometry_map_.insert({geometry_id_a, std::move(geometry_)});
    }

    void GPUDriverD3D11::UpdateGeometry(uint32_t geometry_id_a,
                                        const ul::VertexBuffer& vertices_a,
                                        const ul::IndexBuffer& indices_a)
    {
        auto iter_ = geometry_map_.find(geometry_id_a);
        if (iter_ == geometry_map_.end())
            FatalError(
                    "GPUDriverD3D11::UpdateGeometry, geometry id doesn't "
                    "exist.");

        auto& entry_ = iter_->second;
        D3D11_MAPPED_SUBRESOURCE res_;

        d3d_->device_context_->Map(entry_.vertex_buffer_.Get(),
                                   0,
                                   D3D11_MAP_WRITE_DISCARD,
                                   0,
                                   &res_);
        
        memcpy(res_.pData, vertices_a.data, vertices_a.size);
        d3d_->device_context_->Unmap(entry_.vertex_buffer_.Get(), 0);

        d3d_->device_context_->Map(entry_.index_buffer_.Get(),
                                   0,
                                   D3D11_MAP_WRITE_DISCARD,
                                   0,
                                   &res_);
        
        memcpy(res_.pData, indices_a.data, indices_a.size);
        d3d_->device_context_->Unmap(entry_.index_buffer_.Get(), 0);
    }

    void GPUDriverD3D11::DestroyGeometry(uint32_t geometry_id_a)
    {
        auto iter_ = geometry_map_.find(geometry_id_a);
        if (iter_ != geometry_map_.end())
        {
            iter_->second.vertex_buffer_.Reset();
            iter_->second.index_buffer_.Reset();
            geometry_map_.erase(iter_);
        }
    }

    void GPUDriverD3D11::DrawGeometry(uint32_t geometry_id_a,
                                      uint32_t index_count_a,
                                      uint32_t index_offset_a,
                                      const ul::GPUState& state_a)
    {
        _BindRenderBuffer(state_a.render_buffer_id);

        _SetViewport(state_a.viewport_width, state_a.viewport_height);

        if (state_a.texture_1_id)
            _BindTexture(0, state_a.texture_1_id);

        if (state_a.texture_2_id)
            _BindTexture(1, state_a.texture_2_id);

        _UpdateConstantBuffer(state_a);

        _BindGeometry(geometry_id_a);

        d3d_->device_context_->PSSetSamplers(0, 1, sampler_state_.GetAddressOf());

        if (state_a.shader_type == ul::ShaderType::kShaderType_Fill)
        {
            d3d_->device_context_->VSSetShader(vs_fill_.GetShader(), nullptr, 0);
            d3d_->device_context_->PSSetShader(ps_fill_.GetShader(), nullptr, 0);
        } 
        else
        {
            d3d_->device_context_->VSSetShader(vs_fill_path_.GetShader(),
                                               nullptr,
                                               0);
            
            d3d_->device_context_->PSSetShader(ps_fill_path_.GetShader(),
                                               nullptr,
                                               0);
        }

        if (state_a.enable_blend)
            d3d_->device_context_->OMSetBlendState(blend_state_enable_blend_.Get(),
                                                   NULL,
                                                   0xFFFFFFFF);
        
        else
            d3d_->device_context_->OMSetBlendState(blend_state_disable_blend_.Get(),
                                                   NULL,
                                                   0xFFFFFFFF);

        if (state_a.enable_scissor)
        {
            d3d_->device_context_->RSSetState(rasterizer_state_scissor_.Get());
            D3D11_RECT scissor_rect_ = {(LONG)(state_a.scissor_rect.left),
                                        (LONG)(state_a.scissor_rect.top),
                                        (LONG)(state_a.scissor_rect.right),
                                        (LONG)(state_a.scissor_rect.bottom)};

            d3d_->device_context_->RSSetScissorRects(1, &scissor_rect_);
        } 
        else
        {
            d3d_->device_context_->RSSetState(rasterizer_state_default_.Get());
        }

        d3d_->device_context_
                ->VSSetConstantBuffers(0, 1, constant_buffer_.GetAddressOf());
        d3d_->device_context_
                ->PSSetConstantBuffers(0, 1, constant_buffer_.GetAddressOf());
        
        d3d_->device_context_->DrawIndexed(index_count_a, index_offset_a, 0);
    }

    void GPUDriverD3D11::ClearRenderBuffer(uint32_t render_buffer_id_a)
    {
        float color_[4] = {0.0f, 0.0f, 0.0f, 0.0f};

        if (render_buffer_id_a == 0)
        {
            d3d_->device_context_->ClearRenderTargetView(
                    d3d_->render_target_view_.Get(),
                    color_);
            
            return;
        }

        auto render_target_iter_ = render_target_map_.find(render_buffer_id_a);
        if (render_target_iter_ == render_target_map_.end())
        {
            FatalError(
                    "GPUDriverD3D11::ClearRenderBuffer, render buffer id "
                    "doesn't exist.");
        }

        d3d_->device_context_->ClearRenderTargetView(
                render_target_iter_->second.render_target_view_.Get(),
                color_);

#if ENABLE_MSAA
        auto texture_iter_ = texture_map_.find(
                render_target_iter_->second.renderTargetTextureId);
        
        if (texture_iter_ == texture_map_.end())
            FatalError(
                    "GPUDriverD3D11::ClearRenderBuffer, render target texture "
                    "id doesn't exist.");

        texture_iter_->second.needsResolve = true;
#endif
    }

    ID3D11ShaderResourceView** GPUDriverD3D11::GetAddressOfShaderResourceView(
                                               ul::RefPtr<ul::View>& view_a)
    {
        auto texture_id_ = view_a->render_target().texture_id;
        auto iter_ = texture_map_.find(texture_id_);
        if (iter_ == texture_map_.end())
            return nullptr;
        
        return iter_->second.texture_srv_.GetAddressOf();
    }

    void GPUDriverD3D11::_LoadShaders()
    {
        HRESULT hr_;
        std::wstring fill_path_vertex_shader_path_ = L"vs_ul_v2f_c4f_t2f.cso";
        hr_ = vs_fill_path_.Initialize(
                d3d_->device_.Get(),
                fill_path_vertex_shader_path_,
                InputLayoutDescription_ultralight_2f_4ub_2f);
        FatalErrorIfFail(hr_, "Failed to initialize fill path vertex shader.");
        
        std::wstring fill_path_pixel_shader_path_ = L"ps_ul_fill_path.cso";
        hr_ = ps_fill_path_.Initialize(d3d_->device_.Get(),
                                    fill_path_pixel_shader_path_);
        FatalErrorIfFail(hr_, "Failed to initialize fill path pixel shader.");

        std::wstring fill_vertex_shader_path_ = L"vs_ul_v2f_c4f_t2f_t2f_d28f.cso";
        hr_ = vs_fill_.Initialize(
                d3d_->device_.Get(),
                fill_vertex_shader_path_,
                InputLayoutDescription_ultralight_2f_4ub_2f_2f_28f);
        FatalErrorIfFail(hr_, "Failed to initialize fill path vertex shader.");
        
        std::wstring fill_pixel_shader_path_ = L"ps_ul_fill.cso";
        hr_ = ps_fill_.Initialize(d3d_->device_.Get(), fill_pixel_shader_path_);
        FatalErrorIfFail(hr_, "Failed to initialize fill path pixel shader.");
    }

    void GPUDriverD3D11::_InitializeSamplerState()
    {
        D3D11_SAMPLER_DESC sampler_desc_ = {};
        sampler_desc_.Filter = D3D11_FILTER_MIN_MAG_MIP_LINEAR;
        sampler_desc_.AddressU = D3D11_TEXTURE_ADDRESS_CLAMP;
        sampler_desc_.AddressV = D3D11_TEXTURE_ADDRESS_CLAMP;
        sampler_desc_.AddressW = D3D11_TEXTURE_ADDRESS_CLAMP;
        sampler_desc_.ComparisonFunc = D3D11_COMPARISON_NEVER;
        sampler_desc_.MinLOD = 0;
        HRESULT hr_ = d3d_->device_->CreateSamplerState(&sampler_desc_,
                                                        &sampler_state_);
        
        FatalErrorIfFail(hr_,
                         "GPUDriverD3D11::InitializeSamplerAndBlendStates "
                         "Failed to create sampler state.");
    }

    void GPUDriverD3D11::_InitializeBlendStates()
    {
        CD3D11_BLEND_DESC blend_desc_enabled_(D3D11_DEFAULT);
        blend_desc_enabled_.RenderTarget[0].BlendEnable = TRUE;
        blend_desc_enabled_.RenderTarget[0].DestBlend =
                D3D11_BLEND_INV_SRC_ALPHA;
        blend_desc_enabled_.RenderTarget[0].SrcBlendAlpha =
                D3D11_BLEND_INV_DEST_ALPHA;
        blend_desc_enabled_.RenderTarget[0].DestBlendAlpha = D3D11_BLEND_ONE;

        HRESULT hr_ = d3d_->device_->CreateBlendState(&blend_desc_enabled_,
                                                      &blend_state_enable_blend_);
        
        FatalErrorIfFail(hr_,
                         "GPUDriverD3D11::InitializeBlendStates failed to "
                         "create enabled blend state");

        CD3D11_BLEND_DESC blend_desc_disabled(D3D11_DEFAULT);

        hr_ = d3d_->device_->CreateBlendState(&blend_desc_disabled,
                                              &blend_state_disable_blend_);
        
        FatalErrorIfFail(hr_,
                         "GPUDriverD3D11::InitializeBlendStates failed to "
                         "create disabled blend state");
    }

    void GPUDriverD3D11::_InitializeRasterizerStates()
    {
        HRESULT hr_;
        CD3D11_RASTERIZER_DESC rasterizer_desc_default_(D3D11_DEFAULT);
        rasterizer_desc_default_.CullMode = D3D11_CULL_NONE;
        rasterizer_desc_default_.DepthClipEnable = FALSE;

#if ENABLE_MSAA
        rasterizerDesc_default.MultisampleEnable = true;
        rasterizerDesc_default.AntialiasedLineEnable = true;
#endif

        hr_ = d3d_->device_->CreateRasterizerState(&rasterizer_desc_default_,
                                                   &rasterizer_state_default_);
        
        FatalErrorIfFail(hr_,
                         "GPUDriverD3D11::InitializeRasterizerStates failed to "
                         "create default rasterizer state.");

        CD3D11_RASTERIZER_DESC rasterizer_desc_scissor_(D3D11_DEFAULT);
        rasterizer_desc_scissor_.CullMode = D3D11_CULL_NONE;
        rasterizer_desc_scissor_.DepthClipEnable = FALSE;
        rasterizer_desc_scissor_.ScissorEnable = true;

#if ENABLE_MSAA
        rasterizerDesc_scissor.MultisampleEnable = true;
        rasterizerDesc_scissor.AntialiasedLineEnable = true;
#endif

        hr_ = d3d_->device_->CreateRasterizerState(&rasterizer_desc_scissor_,
                                                   &rasterizer_state_scissor_);
        
        FatalErrorIfFail(hr_,
                         "GPUDriverD3D11::InitializeRasterizerStates failed to "
                         "create scissored rasterizer state.");
    }

    void GPUDriverD3D11::_BindRenderBuffer(uint32_t render_buffer_id_a)
    {
        ID3D11ShaderResourceView* null_srv_[3] = {nullptr, nullptr, nullptr};
        d3d_->device_context_->PSSetShaderResources(0, 3, null_srv_);

        ID3D11RenderTargetView* target_;
        if (render_buffer_id_a == 0)
        {
            target_ = d3d_->render_target_view_.Get();
        } 
        else
        {
            auto render_target_ = render_target_map_.find(render_buffer_id_a);
            if (render_target_ == render_target_map_.end())
                FatalError(
                        "GPUDriverD3D11::BindRenderBuffer, render buffer id "
                        "doesn't exist.");

            target_ = render_target_->second.render_target_view_.Get();

#if ENABLE_MSAA
            auto render_target_texture_ = texture_map_.find(
                                        render_target_->second.renderTargetTextureId);
            
            if (render_target_texture_ == texture_map_.end())
                FatalError(
                        "GPUDriverD3D11::BindRenderBuffer, render target "
                        "texture id doesn't exist.");

            render_target_texture_->second.needsResolve = true;
#endif
        }

        d3d_->device_context_->OMSetRenderTargets(1, &target_, nullptr);
    }

    void GPUDriverD3D11::_SetViewport(uint32_t width_a, uint32_t height_a)
    {
        D3D11_VIEWPORT vp_ = {};
        vp_.Width = (float)width_a;
        vp_.Height = (float)height_a;
        vp_.MinDepth = 0.0f;
        vp_.MaxDepth = 1.0f;
        vp_.TopLeftX = 0;
        vp_.TopLeftY = 0;
        d3d_->device_context_->RSSetViewports(1, &vp_);
    }

    void GPUDriverD3D11::_BindTexture(uint8_t texture_unit_a, uint32_t texture_id_a)
    {
        auto iter_ = texture_map_.find(texture_id_a);
        if (iter_ == texture_map_.end())
            FatalError(
                    "GPUDriverD3D11::BindTexture, texture id doesn't exist.");

        auto& entry_ = iter_->second;

        if (entry_.is_msaa_render_target_)
        {
            if (entry_.needs_resolve_)
            {
                d3d_->device_context_->ResolveSubresource(
                        entry_.resolve_texture_.Get(),
                        0,
                        entry_.texture_.Get(),
                        0,
                        DXGI_FORMAT_B8G8R8A8_UNORM_SRGB);
                entry_.needs_resolve_ = false;
            }
            d3d_->device_context_->PSSetShaderResources(
                    texture_unit_a,
                    1,
                    entry_.resolve_srv_.GetAddressOf());
        } 
        else
        {
            d3d_->device_context_->PSSetShaderResources(
                    texture_unit_a,
                    1,
                    entry_.texture_srv_.GetAddressOf());
        }
    }

    void GPUDriverD3D11::_UpdateConstantBuffer(const ul::GPUState& state_a)
    {
        float screen_width_ = (float)state_a.viewport_width;
        float screen_height_ = (float)state_a.viewport_height;
        ul::Matrix model_view_projection_mat_ = _ApplyProjection(state_a.transform,
                                                                screen_width_,
                                                                screen_height_);

        auto& cb_data_ = constant_buffer_.data_;
        cb_data_.State = {0.0f, screen_width_, screen_height_, 1.0f};

        cb_data_.Transform = DirectX::XMMATRIX(
                model_view_projection_mat_.GetMatrix4x4().data);
        
        cb_data_.Scalar4[0] = {state_a.uniform_scalar[0],
                               state_a.uniform_scalar[1],
                               state_a.uniform_scalar[2],
                               state_a.uniform_scalar[3]};
        
        cb_data_.Scalar4[1] = {state_a.uniform_scalar[4],
                               state_a.uniform_scalar[5],
                               state_a.uniform_scalar[6],
                               state_a.uniform_scalar[7]};
        
        for (size_t i_ = 0; i_ < 8; ++i_)
             cb_data_.Vector[i_] = DirectX::XMFLOAT4(
                      state_a.uniform_vector[i_].value);
        
        cb_data_.ClipSize = state_a.clip_size;
        for (size_t i_ = 0; i_ < state_a.clip_size; ++i_)
             cb_data_.Clip[i_] = DirectX::XMMATRIX(state_a.clip[i_].data);
        
        constant_buffer_.ApplyChanges();
    }

    void GPUDriverD3D11::_BindGeometry(uint32_t geometry_id_a)
    {
        auto iter_ = geometry_map_.find(geometry_id_a);
        if (iter_ == geometry_map_.end())
            FatalError(
                    "GPUDriverD3D11::BindGeometry geometry id does not exist "
                    "in geometry map.");

        auto& geometry_ = iter_->second;
        UINT stride_ = geometry_.format_ == ul::kVertexBufferFormat_2f_4ub_2f
                                         ? sizeof(ul::Vertex_2f_4ub_2f)
                                         : sizeof(ul::Vertex_2f_4ub_2f_2f_28f);
        
        UINT offset_ = 0;
        d3d_->device_context_->IASetVertexBuffers(
                0,
                1,
                geometry_.vertex_buffer_.GetAddressOf(),
                &stride_,
                &offset_);
        
        d3d_->device_context_->IASetIndexBuffer(geometry_.index_buffer_.Get(),
                                              DXGI_FORMAT_R32_UINT,
                                              0);
        
        d3d_->device_context_->IASetPrimitiveTopology(
                D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);
        
        if (geometry_.format_ == ul::kVertexBufferFormat_2f_4ub_2f)
            d3d_->device_context_->IASetInputLayout(vs_fill_path_.GetInputLayout());
        else
            d3d_->device_context_->IASetInputLayout(vs_fill_.GetInputLayout());
    }

    ul::Matrix GPUDriverD3D11::_ApplyProjection(const ul::Matrix4x4& transform_a,
                                               float screen_width_a,
                                               float screen_height_a)
    {
        ul::Matrix transform_matrix_a;
        transform_matrix_a.Set(transform_a);

        ul::Matrix result_;
        result_.SetOrthographicProjection(screen_width_a, screen_height_a, false);
        result_.Transform(transform_matrix_a);

        return result_;
    }
} // namespace VE_Kernel