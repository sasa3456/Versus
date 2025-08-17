#include "D3DClass.hpp"
#include "../../Window/Window.hpp"

namespace VE_Kernel
{
    bool D3DClass::Initialize(Window* window_a)
    {
        hwnd_   = window_a->GetHWND();
        width_  = window_a->GetWidth();
        height_ = window_a->GetHeight();

        if (!_InitializeDeviceAndSwapchain())
            return false;

        if (!_InitializeRenderTarget())
            return false;

        if (!_InitializeDepthStencilBufferAndState())
            return false;

        if (!_InitializeRasterizerState())
            return false;

        if (!_InitializeSamplerState())
            return false;

        return true;
    }

    bool D3DClass::_InitializeDeviceAndSwapchain()
    {
        DXGI_SWAP_CHAIN_DESC scd_ = {0};

        scd_.BufferDesc.Width = width_;
        scd_.BufferDesc.Height = height_;
        scd_.BufferDesc.RefreshRate.Numerator = 60;
        scd_.BufferDesc.RefreshRate.Denominator = 1;
        scd_.BufferDesc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;

        scd_.BufferDesc.ScanlineOrdering = DXGI_MODE_SCANLINE_ORDER_UNSPECIFIED;
        scd_.BufferDesc.Scaling = DXGI_MODE_SCALING_UNSPECIFIED;

        scd_.SampleDesc.Count = 1;
        scd_.SampleDesc.Quality = 0;

        scd_.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
        scd_.BufferCount = 1;
        scd_.OutputWindow = hwnd_;
        scd_.Windowed = TRUE;
        scd_.SwapEffect = DXGI_SWAP_EFFECT_DISCARD;
        scd_.Flags = DXGI_SWAP_CHAIN_FLAG_ALLOW_MODE_SWITCH;

        HRESULT hr_;
        hr_ = D3D11CreateDeviceAndSwapChain(
                 nullptr,
                 D3D_DRIVER_TYPE_HARDWARE,
                 0,
                 D3D11_CREATE_DEVICE_DEBUG,
                 nullptr,
                 0,
                 D3D11_SDK_VERSION,
                 &scd_,
                 &swapchain_,
                 &device_,
                 NULL,
                 &device_context_);

        ReturnFalseIfFail(
                hr_, "D3D11 Device/DeviceContext/Swapchain creation failed.");

        return true;
    }

    bool D3DClass::_InitializeRenderTarget()
    {
        Microsoft::WRL::ComPtr<ID3D11Texture2D> back_buffer_;
        HRESULT hr_ = swapchain_->GetBuffer(0,
                                            __uuidof(ID3D11Texture2D),
                                            reinterpret_cast<void**>(
                                                  back_buffer_.GetAddressOf()));
        
        ReturnFalseIfFail(hr_, "D3D11 Swapchain backbuffer retrieval failed.");
        hr_ = device_->CreateRenderTargetView(back_buffer_.Get(),
                                              NULL,
                                              &render_target_view_);
        
        ReturnFalseIfFail(hr_, "D3D11 Failed to create render target view.");

        return true;
    }

    bool D3DClass::_InitializeDepthStencilBufferAndState()
    {
        CD3D11_TEXTURE2D_DESC depth_stencil_texture_desc_(
                DXGI_FORMAT_D24_UNORM_S8_UINT,
                width_,
                height_);

        depth_stencil_texture_desc_.MipLevels = 1;
        depth_stencil_texture_desc_.BindFlags = D3D11_BIND_DEPTH_STENCIL;
        depth_stencil_texture_desc_.SampleDesc.Count = 1;
        depth_stencil_texture_desc_.SampleDesc.Quality = 0;

        HRESULT hr_ = device_->CreateTexture2D(&depth_stencil_texture_desc_,
                                               NULL,
                                               &depth_stencil_buffer_);
        
        ReturnFalseIfFail(
                hr_, "D3D11 Failed to create texture for depth stencil buffer.");

        hr_ = device_->CreateDepthStencilView(depth_stencil_buffer_.Get(),
                                              NULL,
                                              &depth_stencil_view_);
        
        ReturnFalseIfFail(hr_, "D3D11 Failed to create depth stencil view.");

        CD3D11_DEPTH_STENCIL_DESC depth_stencil_desc_(D3D11_DEFAULT);
        depth_stencil_desc_.DepthFunc = D3D11_COMPARISON_FUNC::
                                        D3D11_COMPARISON_LESS_EQUAL;

        hr_ = device_->CreateDepthStencilState(&depth_stencil_desc_,
                                               &depth_stencil_state_);

        ReturnFalseIfFail(hr_, "D3D11 Failed to create depth stencil state.");

        return true;
    }

    bool D3DClass::_InitializeRasterizerState()
    {
        CD3D11_RASTERIZER_DESC rasterizer_desc_(D3D11_DEFAULT);
        rasterizer_desc_.CullMode = D3D11_CULL_NONE;
        HRESULT hr_ = device_->CreateRasterizerState(&rasterizer_desc_,
                                                     &rasterizer_state_);

        ReturnFalseIfFail(hr_, "D3D11 Failed to create rasterizer state.");
        return true;
    }

    bool D3DClass::_InitializeSamplerState()
    {
        CD3D11_SAMPLER_DESC samp_desc_(D3D11_DEFAULT);
        samp_desc_.Filter = D3D11_FILTER_MIN_MAG_MIP_POINT;
        samp_desc_.AddressU = D3D11_TEXTURE_ADDRESS_CLAMP;
        samp_desc_.AddressV = D3D11_TEXTURE_ADDRESS_CLAMP;
        samp_desc_.AddressW = D3D11_TEXTURE_ADDRESS_CLAMP;
        
        HRESULT hr_ = device_->CreateSamplerState(&samp_desc_,
                                                  &sampler_state_);
                                                              
        ReturnFalseIfFail(hr_, "D3D11 Failed to initialize sampler state.");
        return true;
    }
} // namespace VE_Kernel
