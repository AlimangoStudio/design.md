# MCP tool reference

Alimango exposes constrained semantic design tools rather than arbitrary CSS/canvas manipulation.

Core tools:
- `create_project`
- `list_projects`
- `get_project`
- `update_branding`
- `list_library`
- `add_block`
- `rename_block`
- `set_block_layout`
- `move_block`
- `add_component`
- `update_component`
- `move_component`
- `remove_component`
- `get_compatible_animations`
- `apply_animation`
- `bind_api`
- `validate_design`
- `create_preview`
- `export_project`

Mutating existing projects require `expected_revision`.

The remote endpoint uses MCP Streamable HTTP POST in the MVP. The server implements `initialize`, `ping`, `tools/list`, `tools/call`, `resources/list` and `resources/read`.
