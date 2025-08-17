#include "HtmlView.hpp"

namespace VE_Kernel
{
    HtmlView::HtmlView(GPUDriverD3D11* gpu_driver_a,
                       ul::RefPtr<ul::View> view_a,
                       VertexBuffer<Vertex_3pf_2tf>& vertex_buffer_a,
                       uint32_t width_a,
                       uint32_t height_a,
                       bool is_transparent_a) : vertex_buffer_(vertex_buffer_a)
    {
        gpu_driver_ = gpu_driver_a;
        view_ = view_a;
        width_ = width_a;
        height_ = height_a;
        is_transparent_ = is_transparent_a;
        view_load_listener_ = std::make_unique<HtmlViewLoadListener>();
        view_->set_load_listener(view_load_listener_.get());

        view_view_listener_ = std::make_unique<HtmlViewViewListener>();
        view_->set_view_listener(view_view_listener_.get());

        _RegisterNativeCFunctions();
        _UpdateWorldMatrix();
    }

    void HtmlView::LoadURL(std::string url_a)
    {
        view_->LoadURL(ul::String(url_a.c_str()));
    }

    bool HtmlView::IsLoading()
    {
        return view_->is_loading();
    }

    void HtmlView::FireMouseEvent(ul::MouseEvent mouse_event_a)
    {
        mouse_event_a.x -= position_.x;
        mouse_event_a.y -= position_.y;
        view_->FireMouseEvent(mouse_event_a);
    }

    void HtmlView::FireKeyboardEvent(ul::KeyEvent keyboard_event_a)
    {
        view_->FireKeyEvent(keyboard_event_a);
    }

    void HtmlView::Focus()
    {
        view_->Focus();
    }

    void HtmlView::SetSize(uint32_t width_a, uint32_t height_a)
    {
        width_ = width_a;
        height_ = height_a;
        view_->Resize(width_, height_);
        _UpdateWorldMatrix();
    }

    void HtmlView::SetPosition(float x_a, float y_a)
    {
        position_.x = x_a;
        position_.y = y_a;
        _UpdateWorldMatrix();
    }

    DirectX::XMMATRIX HtmlView::GetWorldMatrix()
    {
        return world_matrix_;
    }

    ID3D11ShaderResourceView* const* HtmlView::GetAddressOfShaderResourceView()
    {
        return gpu_driver_->GetAddressOfShaderResourceView(view_);
    }

    VertexBuffer<Vertex_3pf_2tf>* HtmlView::GetVertexBuffer()
    {
        return &vertex_buffer_;
    }

    HtmlView::~HtmlView()
    {
        view_ = nullptr;
    }

    void HtmlView::_UpdateWorldMatrix()
    {
        world_matrix_ = DirectX::XMMatrixScaling(width_, height_, 1)
                      * DirectX::XMMatrixTranslation(position_.x, position_.y, 0);
    }

    JSValueRef NativeMessageBox(JSContextRef ctx_a,
                                JSObjectRef fnc_a,
                                JSObjectRef this_object_a,
                                size_t arg_count_a,
                                const JSValueRef args_a[],
                                JSValueRef* exception_a)
    {
        if (arg_count_a != 1)
        {
            OutputDebugStringA(
                    "NativeMessageBox improperly called in javascript. "
                    "Expected exactly 1 argument of type string.");
            
            return JSValueMakeNull(ctx_a);
        }

        JSType arg_type_ = JSValueGetType(ctx_a, args_a[0]);
        if (arg_type_ != JSType::kJSTypeString)
        {
            OutputDebugStringA(
                    "NativeMessageBox improperly called in javascript with an "
                    "argument that was not of type string.");
            
            return JSValueMakeNull(ctx_a);
        }

        JSStringRef msg_argument_js_ref_ = JSValueToStringCopy(ctx_a,
                                                               args_a[0],
                                                               NULL);
        
        size_t length_ = JSStringGetLength(msg_argument_js_ref_) + 1;
        std::unique_ptr<char[]> stringBuffer = std::make_unique<char[]>(length_);
       
        JSStringGetUTF8CString(msg_argument_js_ref_, stringBuffer.get(), length_);
        MessageBoxA(NULL, stringBuffer.get(), "NativeMessageBox", 0);
        
        return JSValueMakeNull(ctx_a);
    }

    void HtmlView::_RegisterNativeCFunctions()
    {
        JSContextRef ctx_ = view_->js_context();
        JSStringRef name_ = JSStringCreateWithUTF8CString("NativeMessageBox");
        JSObjectRef func_ = JSObjectMakeFunctionWithCallback(ctx_, name_,
                                                             NativeMessageBox);
        
        JSObjectRef global_obj_ = JSContextGetGlobalObject(ctx_);
        JSObjectSetProperty(ctx_,
                            global_obj_,
                            name_,
                            func_,
                            0,
                            0);

        JSStringRelease(name_);
    }
} // namespace VE_Kernel