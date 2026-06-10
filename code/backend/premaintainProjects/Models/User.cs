using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class User
{
    public int Userid { get; set; }

    public int? Companyid { get; set; }

    public string? Username { get; set; }

    public string? Industry { get; set; }

    public int? Role { get; set; }

    public string? Mobile { get; set; }

    public DateOnly? Createdate { get; set; }

    public string? Gid { get; set; }

    public string? Email { get; set; }
}
