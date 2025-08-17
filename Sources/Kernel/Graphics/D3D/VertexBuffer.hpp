// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef VERTEXBUFFER_HPP
#define VERTEXBUFFER_HPP

#include "Vertex.hpp"

namespace VE_Kernel
{
    template <class T>
    class VertexBuffer
    {
    public:
        VertexBuffer() {}
        ID3D11Buffer* Get() const;
        ID3D11Buffer* const* GetAddressOf() const;
        
        UINT VertexCount() const;
        UINT Stride() const;
        
        const UINT* StridePtr() const;
        HRESULT Initialize(ID3D11Device* device_a, std::vector<T> data_a);

    private:
        Microsoft::WRL::ComPtr<ID3D11Buffer> buffer_;
        UINT stride_ = sizeof(T);
        std::vector<T> storage_;                      
    };
} // namespace VE_Kernel

#endif
