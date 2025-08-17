#include "VertexShader.hpp"

namespace VE_Kernel
{
    HRESULT VertexShader::Initialize(
            ID3D11Device* device_a,
            std::wstring shader_path_a,
            std::vector<D3D11_INPUT_ELEMENT_DESC> layout_desc_a)
    {
        std::wstring file_path_ = DirectoryHelper::GetExecutableDirectory()
                                + shader_path_a;

        HRESULT hr_ = D3DReadFileToBlob(file_path_.c_str(),
                                        shader_buffer_.GetAddressOf());
        if (FAILED(hr_))
            return hr_;

        hr_ = device_a->CreateVertexShader(shader_buffer_->GetBufferPointer(),
                                           shader_buffer_->GetBufferSize(),
                                           NULL,
                                           &shader_);
        
        if (FAILED(hr_))
            return hr_;

        hr_ = device_a->CreateInputLayout(layout_desc_a.data(),
                                          layout_desc_a.size(),
                                          shader_buffer_->GetBufferPointer(),
                                          shader_buffer_->GetBufferSize(),
                                          &input_layout_);
        
        if (FAILED(hr_))
            return hr_;

        return hr_;
    }

    ID3D11VertexShader* VertexShader::GetShader()
    {
        return shader_.Get();
    }

    ID3D10Blob* VertexShader::GetBuffer()
    {
        return shader_buffer_.Get();
    }

    ID3D11InputLayout* VertexShader::GetInputLayout()
    {
        return input_layout_.Get();
    }
} // namespace VE_Kernel
