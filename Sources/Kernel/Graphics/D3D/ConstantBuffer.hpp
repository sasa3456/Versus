// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef CONSTANTBUFFER_HPP
#define CONSTANTBUFFER_HPP

#include "ConstantBufferTypes.hpp"

#include <Windows.h>
#include <d3d11.h>
#include <wrl/client.h>

namespace VE_Kernel
{
    template <class T>
    class ConstantBuffer
    {
    public:
        ConstantBuffer() {}
        ID3D11Buffer* Get() const;
        ID3D11Buffer* const* GetAddressOf() const;
        HRESULT Initialize(ID3D11Device* device_a,
                           ID3D11DeviceContext* device_context_a);

        HRESULT ApplyChanges();

    public:
        T data_;

    private:
        ID3D11DeviceContext* device_context_ = nullptr;
        Microsoft::WRL::ComPtr<ID3D11Buffer> buffer_;
    };
} // namespace VE_Kernel

#endif
