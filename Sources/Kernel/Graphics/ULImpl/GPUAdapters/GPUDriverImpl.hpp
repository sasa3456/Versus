// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef GPUDRIVERIMPL_HPP
#define GPUDRIVERIMPL_HPP

#include <queue>

#include <Ultralight/Ultralight.h>
#include <Ultralight/MouseEvent.h>
#include <Ultralight/KeyEvent.h>

namespace ul = ultralight;

namespace VE_Kernel
{
    class GPUDriverImpl : public ul::GPUDriver
    {
    public:
        virtual void BeginSynchronize() override;
        virtual void EndSynchronize() override;
        virtual uint32_t NextTextureId() override;
        virtual uint32_t NextRenderBufferId() override;
        virtual uint32_t NextGeometryId() override;
        virtual void UpdateCommandList(const ul::CommandList& list_a) override;
        void DrawCommandList();
        virtual void DrawGeometry(uint32_t geometry_id_a,
                                  uint32_t index_count_a,
                                  uint32_t index_offset_a,
                                  const ul::GPUState& state_a);
        
        virtual void ClearRenderBuffer(uint32_t render_buffer_id_a);

    private:
        uint32_t next_texture_id_ = 1;
        uint32_t next_render_buffer_id_ = 1;
        uint32_t next_geometry_id_ = 1;
        std::vector<ul::Command> command_list_;
    };
} // namespace VE_Kernel

#endif