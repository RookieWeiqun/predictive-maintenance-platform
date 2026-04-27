using System.ComponentModel;

namespace premaintainProjects.Models
{
    public class otherModels
    {
        public enum ResponseCode
        {
            [Description("成功")]
            成功 = 0,
            [Description("参数为空")]
            参数为空 = 1,
            [Description("参数无效")]
            参数无效 = 2,
            [Description("记录不存在")]
            记录不存在 = 3,
            [Description("ModelState状态无效")]
            ModelState状态无效 = 4,
            [Description("验证失败")]
            验证失败 = 5,
            [Description("操作失败")]
            操作失败 = 500,
        }
    }
}
