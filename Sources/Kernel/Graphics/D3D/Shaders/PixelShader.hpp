// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef PIXELSHADER_HPP
#define PIXELSHADER_HPP

#include "../../../Utility/DirectoryHelper.hpp"
#include "../../../Utility/ErrorHandler.hpp"
#include "../../../Utility/Timer.hpp"

#include <Windows.h>
#include <d3d11.h>
#include <d3dcompiler.h>
#include <string>
#include <vector>
#include <wrl/client.h>

namespace VE_Kernel
{
    class PixelShader
    {
    public:
        HRESULT Initialize(ID3D11Device* device_a, std::wstring shader_path_a);
        ID3D11PixelShader* GetShader();
        ID3D10Blob* GetBuffer();

    private:
        Microsoft::WRL::ComPtr<ID3D11PixelShader> shader_;
        Microsoft::WRL::ComPtr<ID3D10Blob> shader_buffer_;
    };
} // namespace VE_Kernel

#endif
