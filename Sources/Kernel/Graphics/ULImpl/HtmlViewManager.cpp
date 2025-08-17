#include "HtmlViewManager.hpp"

namespace VE_Kernel
{
    bool HtmlViewManager::Initialize(D3DClass* d3d_a)
    {
        d3d_ = d3d_a;

        std::vector<Vertex_3pf_2tf> vertices_ = 
        {
                Vertex_3pf_2tf(0.0f, 1.0f, 0.0f, 0.0f, 1.0f),
                Vertex_3pf_2tf(0.0f, 0.0f, 0.0f, 0.0f, 0.0f),
                Vertex_3pf_2tf(1.0f, 1.0f, 0.0f, 1.0f, 1.0f),

                Vertex_3pf_2tf(0.0f, 0.0f, 0.0f, 0.0f, 0.0f),
                Vertex_3pf_2tf(1.0f, 0.0f, 0.0f, 1.0f, 0.0f),
                Vertex_3pf_2tf(1.0f, 1.0f, 0.0f, 1.0f, 1.0f),
        };

        HRESULT hr_ = vertex_buffer_.Initialize(d3d_->device_.Get(), vertices_);
        ReturnFalseIfFail(hr_,
                          "Renderer failed to initialize shared vertex buffer "
                          "for view quad.");

        ul::Config config_;
        config_.use_gpu_renderer = true;
        config_.resource_path = ul::String16(
                std::string(DirectoryHelper::GetExecutableDirectoryA()
                            + "resources").c_str());

        config_.face_winding = ul::kFaceWinding_Clockwise;
        ul::Platform::instance().set_config(config_);

        logger_ = std::make_unique<LoggerDefault>();
        ul::Platform::instance().set_logger(logger_.get());

        font_loader_ = std::make_unique<FontLoaderWin>();
        ul::Platform::instance().set_font_loader(font_loader_.get());

        filesystem_ = std::make_unique<FileSystemDefault>();
        ul::Platform::instance().set_file_system(filesystem_.get());

        gpu_driver_ = std::make_unique<GPUDriverD3D11>(d3d_);
        ul::Platform::instance().set_gpu_driver(gpu_driver_.get());

        ultralight_renderer_ = ul::Renderer::Create();
        if (ultralight_renderer_.get() == nullptr)
            return false;

        return true;
    }

    void HtmlViewManager::UpdateViews()
    {
        ultralight_renderer_->Update();
        ultralight_renderer_->Render();
        gpu_driver_->DrawCommandList();
    }

    std::shared_ptr<HtmlView> HtmlViewManager::CreateView(uint32_t width_a,
                                                          uint32_t height_a,
                                                          bool is_transparent_a)
    {
        ul::RefPtr<ul::View> new_view_a;
        new_view_a = ultralight_renderer_->CreateView(width_a,
                                                      height_a,
                                                      is_transparent_a,
                                                      nullptr);

        if (new_view_a.get() == nullptr)
            return nullptr;

        std::shared_ptr<HtmlView> html_view_ =
                std::make_shared<HtmlView>(gpu_driver_.get(),
                                           new_view_a,
                                           vertex_buffer_,
                                           width_a,
                                           height_a,
                                           is_transparent_a);
        
        html_views_.push_back(html_view_);
        return html_view_;
    }

    void HtmlViewManager::FireMouseEvent(MouseEvent mouse_event_a)
    {
        for (auto v_ : html_views_)
        {
            v_->FireMouseEvent(mouse_event_a.ToUltralightMouseEvent());
        }
    }

    void HtmlViewManager::FireKeyboardEvent(KeyboardEvent keyboard_event_a)
    {
        for (auto v_ : html_views_)
        {
            v_->FireKeyboardEvent(keyboard_event_a.ToUltralightKeyboardEvent());
        }
    }

    std::vector<std::shared_ptr<HtmlView>>& HtmlViewManager::GetViews()
    {
        return html_views_;
    }

    HtmlViewManager::~HtmlViewManager()
    {
        ultralight_renderer_ = nullptr;
    }
} // namespace VE_Kernel