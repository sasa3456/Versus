#include "VertexBuffer.hpp"

namespace VE_Kernel
{
    template <class T>
    ID3D11Buffer* VertexBuffer<T>::Get() const
    {
        return buffer_.Get();
    }

    template <class T>
    ID3D11Buffer* const* VertexBuffer<T>::GetAddressOf() const
    {
        return buffer_.GetAddressOf();
    }

    template <class T>
    UINT VertexBuffer<T>::VertexCount() const
    {
        return static_cast<UINT>(storage_.size());
    }

    template <class T>
    UINT VertexBuffer<T>::Stride() const
    {
        return stride_;
    }

    template <class T>
    const UINT* VertexBuffer<T>::StridePtr() const
    {
        return &stride_;
    }

    template <class T>
    HRESULT VertexBuffer<T>::Initialize(ID3D11Device* device_a,
                                        std::vector<T> data_a)
    {
        storage_ = data_a;

        if (data_a.size() == 0)
        {
            return E_FAIL;
        } 
        else
        {
            D3D11_BUFFER_DESC vertex_buffer_desc_ = {};

            vertex_buffer_desc_.Usage = D3D11_USAGE_DEFAULT;
            vertex_buffer_desc_.ByteWidth = stride_ * storage_.size();
            vertex_buffer_desc_.BindFlags = D3D11_BIND_VERTEX_BUFFER;
            vertex_buffer_desc_.CPUAccessFlags = 0;
            vertex_buffer_desc_.MiscFlags = 0;

            D3D11_SUBRESOURCE_DATA vertex_buffer_data_;
            ZeroMemory(&vertex_buffer_data_, sizeof(vertex_buffer_data_));
            vertex_buffer_data_.pSysMem = data_a.data();

            HRESULT hr_ = device_a->CreateBuffer(&vertex_buffer_desc_,
                                                 &vertex_buffer_data_,
                                                 &buffer_);
          
            return hr_;
        }
    }

    template VertexBuffer<Vertex_3pf_2tf>;
} // namespace VE_Kernel
