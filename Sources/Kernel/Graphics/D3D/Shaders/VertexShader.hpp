// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef VERTEXSHADER_HPP
#define VERTEXSHADER_HPP

#include "../../../Utility/DirectoryHelper.hpp"
#include "../../../Utility/ErrorHandler.hpp"

#include <Windows.h>
#include <d3d11.h>
#include <d3dcompiler.h>
#include <string>
#include <vector>
#include <wrl/client.h>

namespace VE_Kernel
{
    class VertexShader
    {
    public:
        HRESULT Initialize(ID3D11Device* device_a,
                           std::wstring shader_path_a,
                           std::vector<D3D11_INPUT_ELEMENT_DESC> layout_desc_a);
        
        ID3D11VertexShader* GetShader();
        ID3D10Blob* GetBuffer();
        ID3D11InputLayout* GetInputLayout();

    private:
        Microsoft::WRL::ComPtr<ID3D11VertexShader> shader_;
        Microsoft::WRL::ComPtr<ID3D10Blob> shader_buffer_;
        Microsoft::WRL::ComPtr<ID3D11InputLayout> input_layout_;
    };
} // namespace VE_Kernel

#endif
