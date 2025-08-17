#include "GPUDriverImpl.hpp"

namespace VE_Kernel
{
    void GPUDriverImpl::BeginSynchronize()
    {}

    void GPUDriverImpl::EndSynchronize()
    {}

    uint32_t GPUDriverImpl::NextTextureId()
    {
        return next_texture_id_++;
    }

    uint32_t GPUDriverImpl::NextRenderBufferId()
    {
        return next_geometry_id_++;
    }

    uint32_t GPUDriverImpl::NextGeometryId()
    {
        return next_geometry_id_++;
    }

    void GPUDriverImpl::UpdateCommandList(const ul::CommandList& list_a)
    {
        if (list_a.size)
        {
            command_list_.resize(list_a.size);
            memcpy(&command_list_[0],
                   list_a.commands,
                   sizeof(ul::Command) * list_a.size);
        }
    }

    void GPUDriverImpl::DrawCommandList()
    {
        if (command_list_.empty())
            return;
        
        for (auto& cmd_ : command_list_)
        {
            if (cmd_.command_type == ul::kCommandType_DrawGeometry)
                DrawGeometry(cmd_.geometry_id,
                             cmd_.indices_count,
                             cmd_.indices_offset,
                             cmd_.gpu_state);
            
            else if (cmd_.command_type == ul::kCommandType_ClearRenderBuffer)
                ClearRenderBuffer(cmd_.gpu_state.render_buffer_id);
        }

        command_list_.clear();
    }

    void GPUDriverImpl::DrawGeometry(uint32_t geometry_id_a,
                                     uint32_t index_count_a,
                                     uint32_t index_offset_a,
                                     const ul::GPUState& state_a)
    {
        // Implementation is overriden in GPUDriverD3D11
    }

    void GPUDriverImpl::ClearRenderBuffer(uint32_t render_buffer_id_a)
    {
        // Implementation is overriden in GPUDriverD3D11
    }
} // namespace VE_KErnel