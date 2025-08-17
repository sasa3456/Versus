#include "ConstantBuffer.hpp"

namespace VE_Kernel
{
    template <class T>
    ID3D11Buffer* ConstantBuffer<T>::Get() const
    {
        return buffer_.Get();
    }

    template <class T>
    ID3D11Buffer* const* ConstantBuffer<T>::GetAddressOf() const
    {
        return buffer_.GetAddressOf();
    }

    template <class T>
    HRESULT ConstantBuffer<T>::Initialize(ID3D11Device* device_a,
                                          ID3D11DeviceContext* device_context_a)
    {
        device_context_ = device_context_a;

        D3D11_BUFFER_DESC desc_ = {};
        desc_.Usage = D3D11_USAGE_DYNAMIC;
        desc_.BindFlags = D3D11_BIND_CONSTANT_BUFFER;
        desc_.CPUAccessFlags = D3D11_CPU_ACCESS_WRITE;
        desc_.MiscFlags = 0;
        desc_.ByteWidth = static_cast<UINT>(
                          sizeof(T) + (16 - (sizeof(T) % 16)));

        desc_.StructureByteStride = 0;

        HRESULT hr_ = device_a->CreateBuffer(&desc_, 0, &buffer_);
        return hr_;
    }

    template <class T>
    HRESULT ConstantBuffer<T>::ApplyChanges()
    {
        D3D11_MAPPED_SUBRESOURCE mapped_resource_;
        HRESULT hr_ = device_context_->Map(buffer_.Get(), 0,
                                           D3D11_MAP_WRITE_DISCARD, 0,
                                           &mapped_resource_);
        
        if (FAILED(hr_))
        {
            return hr_;
        }

        CopyMemory(mapped_resource_.pData, &data_, sizeof(T));
        device_context_->Unmap(buffer_.Get(), 0);
        return hr_;
    }

    template ConstantBuffer<DirectX::XMMATRIX>;
    template ConstantBuffer<ConstantBufferType_Ultralight>;
} // namespace VE_Kernel