#include "Renderer.hpp"
#include "../Window/Window.hpp"
#include "D3D/InputLayoutDescriptions.hpp"

namespace VE_Kernel
{
    bool Renderer::Initialize(Window* window_a)
    {
        window_ = window_a;
        if (!d3d_.Initialize(window_))
            return false;

        if (!_InitializeConstantBuffers())
            return false;

        if (!_InitializeShaders())
            return false;

        return true;
    }

    void Renderer::BeginFrame()
    {
        d3d_.device_context_->ClearState();

        d3d_.device_context_->OMSetRenderTargets(
                1,
                d3d_.render_target_view_.GetAddressOf(),
                d3d_.depth_stencil_view_.Get());
        
        d3d_.device_context_->OMSetDepthStencilState(
            d3d_.depth_stencil_state_.Get(), 0);

        d3d_.device_context_->IASetPrimitiveTopology(
                D3D11_PRIMITIVE_TOPOLOGY::
                        D3D10_PRIMITIVE_TOPOLOGY_TRIANGLELIST);
        
        CD3D11_VIEWPORT viewport_(0.0f,
                                  0.0f,
                                  static_cast<float>(window_->GetWidth()),
                                  static_cast<float>(window_->GetHeight()));
        
        d3d_.device_context_->RSSetViewports(1, &viewport_);
        d3d_.device_context_->RSSetState(d3d_.rasterizer_state_.Get());
        d3d_.device_context_->PSSetSamplers(0, 1, 
            d3d_.sampler_state_.GetAddressOf());

        float background_color_[] = {0.0f, 0.0f, 0.0f, 0.0f};
        d3d_.device_context_->ClearRenderTargetView(d3d_.render_target_view_.Get(),
                                                    background_color_);
       
        d3d_.device_context_->ClearDepthStencilView(d3d_.depth_stencil_view_.Get(),
                                                    D3D11_CLEAR_DEPTH | D3D11_CLEAR_STENCIL,
                                                    1.0f, 0);
    }

    void Renderer::EndFrame()
    {
        d3d_.swapchain_->Present(1, NULL);
    }

    void Renderer::RenderView(std::shared_ptr<HtmlView> view_a)
    {
        if (view_a->IsLoading() == false)
        {
            cb_world_matrix_.data_ = view_a->GetWorldMatrix();
            cb_world_matrix_.ApplyChanges();

            d3d_.device_context_->IASetInputLayout(
                                     vs_orthographic2d_.GetInputLayout());
            
            d3d_.device_context_->PSSetShader(ps_orthographic2d_.GetShader(),
                                              nullptr, 0);
            
            d3d_.device_context_->VSSetShader(vs_orthographic2d_.GetShader(),
                                              nullptr, 0);
            
            d3d_.device_context_
                    ->VSSetConstantBuffers(0, 1, cb_ortho_matrix_.GetAddressOf());
            d3d_.device_context_
                    ->VSSetConstantBuffers(1, 1, cb_world_matrix_.GetAddressOf());
            d3d_.device_context_->PSSetShaderResources( 0, 1,
                    view_a->GetAddressOfShaderResourceView());

            UINT offsets_ = 0;
            auto vb_view_ = view_a->GetVertexBuffer();
            d3d_.device_context_->IASetVertexBuffers(0, 1, vb_view_->GetAddressOf(),
                                                     vb_view_->StridePtr(), &offsets_);
            
            d3d_.device_context_->Draw(vb_view_->VertexCount(), 0);
        }
    }

    D3DClass* Renderer::GetD3DPtr()
    {
        return &d3d_;
    }

    bool Renderer::_InitializeShaders()
    {
        HRESULT hr_ = ps_orthographic2d_.Initialize(d3d_.device_.Get(),
                                                    L"ps_4pf_2tf.cso");
        
        ReturnFalseIfFail(
                hr_,
                "Renderer failed to initialize orthographic 2d pixel shader.");

        hr_ = vs_orthographic2d_.Initialize(d3d_.device_.Get(),
                                            L"vs_3pf_2tf.cso",
                                            InputLayoutDescription_3pf_2tf);
        
        ReturnFalseIfFail(
                hr_,
                "Renderer failed to initialize orthographic 2d pixel shader.");

        return true;
    }

    bool Renderer::_InitializeConstantBuffers()
    {
        HRESULT hr_ = cb_ortho_matrix_.Initialize(d3d_.device_.Get(),
                                                  d3d_.device_context_.Get());
        
        ReturnFalseIfFail(hr_,
                          "Renderer failed to initialize constant buffer for "
                          "orthographic matrix.");
        
        cb_ortho_matrix_.data_ =
                DirectX::XMMatrixOrthographicOffCenterLH(0,
                                                         window_->GetWidth(),
                                                         window_->GetHeight(),
                                                         0,
                                                         0,
                                                         100);
        
        hr_ = cb_ortho_matrix_.ApplyChanges();
        ReturnFalseIfFail(hr_,
                          "Renderer failed to apply changes to constant buffer "
                          "for orthographic matrix.");

        hr_ = cb_world_matrix_.Initialize(d3d_.device_.Get(),
                                          d3d_.device_context_.Get());
        
        ReturnFalseIfFail(hr_,
                          "Renderer failed to initialize constant buffer for "
                          "quad world matrix.");
       
        cb_world_matrix_.data_ = DirectX::XMMatrixScaling(window_->GetWidth() / 2,
                                                          window_->GetHeight() / 2, 1);

        hr_ = cb_world_matrix_.ApplyChanges();
        ReturnFalseIfFail(hr_,
                          "Renderer failed to apply changes to constant buffer "
                          "for quad world matrix.");

        return true;
    }
} // namespace VE_Kernel