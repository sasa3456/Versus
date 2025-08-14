#pragma once
#include "../../Editor/pch.hpp"
#include "D3D/D3DClass.hpp"
#include "D3D/ConstantBuffer.hpp"
#include "D3D/Shaders/VertexShader.hpp"
#include "D3D/Shaders/PixelShader.hpp"
#include "D3D/VertexBuffer.hpp"
#include "ULImpl/HtmlView.hpp"

class Window;
class Renderer
{
public:
	bool Initialize(Window* pWindow);
	void BeginFrame();
	void EndFrame();
	void RenderView(std::shared_ptr<HtmlView> view);
	D3DClass* GetD3DPtr();
private:
	bool InitializeShaders();
	bool InitializeConstantBuffers();
	D3DClass d3d;
	ConstantBuffer<DirectX::XMMATRIX> cb_orthoMatrix;
	ConstantBuffer<DirectX::XMMATRIX> cb_worldMatrix;
	PixelShader ps_orthographic2d;
	VertexShader vs_orthographic2d;
	Window* pWindow = nullptr;
};
