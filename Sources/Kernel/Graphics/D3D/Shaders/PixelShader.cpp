#include "PixelShader.hpp"

namespace VE_Kernel
{
    HRESULT PixelShader::Initialize(ID3D11Device* device_a,
                                    std::wstring shader_path_a)
    {
        std::wstring file_path_ = DirectoryHelper::GetExecutableDirectory()
                                + shader_path_a;

        HRESULT hr_ = D3DReadFileToBlob(file_path_.c_str(), &shader_buffer_);

        if (FAILED(hr_))
        {
            return hr_;
        }

        hr_ = device_a->CreatePixelShader(
                      shader_buffer_.Get()->GetBufferPointer(),
                      shader_buffer_.Get()->GetBufferSize(),
                      NULL,
                      &shader_);

        if (FAILED(hr_))
        {
            return hr_;
        }

        return hr_;
    }

    ID3D11PixelShader* PixelShader::GetShader()
    {
        return shader_.Get();
    }

    ID3D10Blob* PixelShader::GetBuffer()
    {
        return shader_buffer_.Get();
    }
} // namespace VE_Kernel