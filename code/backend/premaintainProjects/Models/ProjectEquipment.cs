using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class ProjectEquipment
{
    public int Peid { get; set; }

    public int Projectid { get; set; }

    public int Equipmentid { get; set; }

    public bool Ifdel { get; set; }

    public int? Templateid { get; set; }
}
