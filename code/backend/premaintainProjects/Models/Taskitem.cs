using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class Taskitem
{
    public int Itemid { get; set; }

    public int? Taskid { get; set; }

    public string? Name { get; set; }

    public string? Categorypath { get; set; }

    public string? Result { get; set; }

    public bool Isnormal { get; set; }

    public bool Isrecheck { get; set; }

    public string? Photopath { get; set; }

    public DateTime? Createtime { get; set; }
}
