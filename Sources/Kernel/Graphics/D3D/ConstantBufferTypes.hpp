// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef CONSTANTBUFFERTYPES_HPP
#define CONSTANTBUFFERTYPES_HPP

#include <DirectXMath.h>

namespace VE_Kernel
{
    struct ConstantBufferType_Ultralight
    {
        DirectX::XMFLOAT4 State;
        DirectX::XMMATRIX Transform;
        DirectX::XMFLOAT4 Scalar4[2];
        DirectX::XMFLOAT4 Vector[8];
        uint32_t ClipSize;
        DirectX::XMMATRIX Clip[8];
    };
} // namespace VE_Kernel

#endif
