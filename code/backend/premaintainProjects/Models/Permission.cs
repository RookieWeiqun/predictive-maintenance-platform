using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class Permission
{
    public int Permissionid { get; set; }

    public string Permission1 { get; set; } = null!;

    public int? Type { get; set; }

    public string? Path { get; set; }

    public int? Sort { get; set; }

    public string? Icon { get; set; }
}
