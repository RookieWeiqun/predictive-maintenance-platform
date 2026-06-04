using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class RolePermission
{
    public int Rpid { get; set; }

    public int Roleid { get; set; }

    public int Permissionid { get; set; }

    public bool Cando { get; set; }
}
