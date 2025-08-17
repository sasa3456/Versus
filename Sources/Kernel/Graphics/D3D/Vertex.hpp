// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef VERTEX_HPP
#define VERTEX_HPP

#include <DirectXMath.h>
#include <Windows.h>
#include <d3d11.h>
#include <vector>
#include <wrl/client.h>

namespace VE_Kernel
{
    class Vertex_3pf_2tf
    {
    public:
        Vertex_3pf_2tf(float x_a, float y_a, float z_a, float u_a, float v_a)
        {
            position_ = DirectX::XMFLOAT3(x_a, y_a, z_a);
            texture_ = DirectX::XMFLOAT2(u_a, v_a);
        }

    public:
        DirectX::XMFLOAT3 position_;
        DirectX::XMFLOAT2 texture_;
    };
} // namespace VE_Kernel

#endif
